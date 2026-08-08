import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable, PassThrough } from "stream";
import ffmpeg from "fluent-ffmpeg";
import { findMovieFile, getMovieMeta } from "@/app/lib/serverUtils";
import { isUnlocked } from "@/app/lib/session";
import { getSettings, type TranscodeQuality } from "@/app/lib/db";
import { decideDelivery, probeSafe } from "@/app/lib/media";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
};

const QUALITY: Record<TranscodeQuality, { crf: string; preset: string; maxHeight: number }> = {
  low: { crf: "30", preset: "ultrafast", maxHeight: 480 },
  medium: { crf: "26", preset: "ultrafast", maxHeight: 720 },
  high: { crf: "22", preset: "ultrafast", maxHeight: 1080 },
};

/**
 * Pipes an ffmpeg command to the client and tears the process down as soon as
 * the browser disconnects. Without the abort wiring, seeking a long file leaves
 * an orphaned ffmpeg pegging the CPU for the rest of the runtime.
 */
function streamFfmpeg(
  command: ffmpeg.FfmpegCommand,
  request: NextRequest,
  contentType: string
): NextResponse {
  const passThrough = new PassThrough();
  let finished = false;

  command
    .on("error", (err: Error) => {
      const benign = /SIGKILL|Premature close|Output stream closed|EPIPE/i.test(err.message);
      if (!finished && !benign) console.error("[soyo] ffmpeg:", err.message);
      passThrough.destroy();
    })
    .on("end", () => {
      finished = true;
    })
    .pipe(passThrough, { end: true });

  const abort = () => {
    finished = true;
    try {
      command.kill("SIGKILL");
    } catch {
      /* already gone */
    }
    passThrough.destroy();
  };

  request.signal.addEventListener("abort", abort);

  return new NextResponse(Readable.toWeb(passThrough) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      // Transcoded output has no known length, so range requests are refused;
      // the player seeks by re-requesting with ?t=.
      "Accept-Ranges": "none",
      "X-Soyo-Seekable": "restart",
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movie: string }> }
) {
  const { movie } = await params;
  const decoded = decodeURIComponent(movie);

  const meta = getMovieMeta(decoded);
  if (meta?.private && !(await isUnlocked())) {
    return new NextResponse("Locked", { status: 403 });
  }

  const filePath = findMovieFile(decoded);
  if (!filePath) return new NextResponse("File not found", { status: 404 });

  const extension = path.extname(filePath).toLowerCase();
  const settings = getSettings();
  const { searchParams } = new URL(request.url);

  const startAt = Math.max(0, Number(searchParams.get("t")) || 0);
  const forced = searchParams.get("mode");

  const probeResult = await probeSafe(filePath);
  let mode = decideDelivery(extension, probeResult);

  if (settings.transcode === "always") mode = "transcode";
  else if (settings.transcode === "never" && mode === "transcode") mode = "direct";
  if (forced === "direct" || forced === "remux" || forced === "transcode") mode = forced;

  /* ---------------------------------------------------------------- *
   * Direct byte streaming — real range support, instant seeking.
   * ---------------------------------------------------------------- */
  if (mode === "direct") {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const contentType = MIME[extension] ?? "video/mp4";
    const range = request.headers.get("range");

    if (range) {
      const matches = /bytes=(\d*)-(\d*)/.exec(range);
      const start = matches?.[1] ? parseInt(matches[1], 10) : 0;
      const end = matches?.[2] ? parseInt(matches[2], 10) : fileSize - 1;

      if (Number.isNaN(start) || start >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const safeEnd = Math.min(end, fileSize - 1);
      const file = fs.createReadStream(filePath, { start, end: safeEnd });
      request.signal.addEventListener("abort", () => file.destroy());

      return new NextResponse(Readable.toWeb(file) as ReadableStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${safeEnd}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(safeEnd - start + 1),
          "Content-Type": contentType,
          "Cache-Control": "no-store",
        },
      });
    }

    const file = fs.createReadStream(filePath);
    request.signal.addEventListener("abort", () => file.destroy());

    return new NextResponse(Readable.toWeb(file) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Length": String(fileSize),
        "Accept-Ranges": "bytes",
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  }

  /* ---------------------------------------------------------------- *
   * Remux — h264/aac already inside a container the browser refuses
   * (usually .mkv). Rewrapping with `-c copy` is near-instant and keeps
   * the original quality, unlike the old blanket VP9 re-encode.
   * ---------------------------------------------------------------- */
  if (mode === "remux") {
    const command = ffmpeg(filePath)
      .inputOptions([
        "-analyzeduration", "10000000",
        "-probesize", "10000000",
        "-fflags", "+genpts",
        ...(startAt > 0 ? ["-ss", String(startAt)] : [])
      ])
      .outputOptions([
        // Only the first video and audio stream. Without explicit maps, mkv
        // attachments and data streams leak into the output as bin_data.
        "-map 0:v:0",
        "-map 0:a:0?",
        "-c:v copy",
        "-c:a copy",
        "-sn",
        "-dn",
        "-map_chapters -1",
        "-avoid_negative_ts", "make_zero",
        "-movflags frag_keyframe+empty_moov+default_base_moof",
        "-f mp4",
      ]);

    return streamFfmpeg(command, request, "video/mp4");
  }

  /* ---------------------------------------------------------------- *
   * Transcode — the codecs themselves are unplayable (HEVC, AC3, DTS…).
   * ---------------------------------------------------------------- */
  const quality = QUALITY[settings.transcodeQuality] ?? QUALITY.medium;
  const needsScale = (probeResult?.height ?? 0) > quality.maxHeight;

  const command = ffmpeg(filePath)
    .inputOptions([
      "-analyzeduration", "10000000",
      "-probesize", "10000000",
      "-fflags", "+genpts",
      ...(startAt > 0 ? ["-ss", String(startAt)] : [])
    ])
    .videoCodec("libx264")
    .audioCodec("aac")
    .audioChannels(2)
    .audioBitrate("160k")
    .outputOptions([
      "-map 0:v:0",
      "-map 0:a:0?",
      `-preset ${quality.preset}`,
      `-crf ${quality.crf}`,
      "-profile:v high",
      "-level 4.1",
      "-pix_fmt yuv420p",
      "-sn",
      "-dn",
      // MKV chapters otherwise become a bin_data track in the MP4 output.
      "-map_chapters -1",
      ...(needsScale ? [`-vf scale=-2:${quality.maxHeight}`] : []),
      "-avoid_negative_ts", "make_zero",
      "-movflags frag_keyframe+empty_moov+default_base_moof",
      "-f mp4",
    ]);

  return streamFfmpeg(command, request, "video/mp4");
}

import { NextResponse } from "next/server";
import path from "path";
import { findMovieFile, getMovieMeta, getLibrary } from "@/app/lib/serverUtils";
import { isUnlocked } from "@/app/lib/session";
import { getProgress, getSettings, readDB } from "@/app/lib/db";
import { decideDelivery, probeSafe } from "@/app/lib/media";
import { listTracks } from "@/app/lib/subtitles";

export const dynamic = "force-dynamic";

/**
 * Everything the player needs before the first frame: how the file will be
 * delivered (which decides whether native seeking works), the resume point,
 * the subtitle tracks, and what plays next in the same folder.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ movie: string }> }) {
  const { movie } = await params;
  const name = decodeURIComponent(movie);

  const meta = getMovieMeta(name);
  const unlocked = await isUnlocked();

  if (meta?.private && !unlocked) {
    return NextResponse.json({ error: "Locked" }, { status: 403 });
  }

  const filePath = findMovieFile(name);
  if (!filePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const extension = path.extname(filePath).toLowerCase();
  const settings = getSettings();

  const [probeResult, tracks] = await Promise.all([probeSafe(filePath), listTracks(filePath)]);

  let delivery = decideDelivery(extension, probeResult);
  if (settings.transcode === "always") delivery = "transcode";
  else if (settings.transcode === "never" && delivery === "transcode") delivery = "direct";

  // Next up: the following file in the same folder, alphabetically.
  const library = await getLibrary(unlocked);
  const siblings = library
    .filter((m) => m.folder === (meta?.folder ?? ""))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const position = siblings.findIndex((m) => m.name === name);
  const next = position !== -1 && position < siblings.length - 1 ? siblings[position + 1] : null;

  const entry = getProgress(name);

  return NextResponse.json({
    name,
    folder: meta?.folder ?? "",
    format: extension,
    size: meta?.size ?? 0,
    delivery,
    /** Byte-range seeking only exists for direct streams. */
    seekable: delivery === "direct",
    probe: probeResult && {
      duration: probeResult.duration,
      width: probeResult.width,
      height: probeResult.height,
      videoCodec: probeResult.videoCodec,
      audioCodec: probeResult.audioCodec,
      bitrate: probeResult.bitrate,
      audioTracks: probeResult.audios.length,
    },
    subtitles: tracks,
    progress: entry,
    favorite: readDB().favorites.includes(name),
    next: next && { name: next.name, thumbnail: next.thumbnail },
    settings: {
      autoplay: settings.autoplay,
      autoplayNext: settings.autoplayNext,
      defaultVolume: settings.defaultVolume,
      seekStep: settings.seekStep,
      rememberPosition: settings.rememberPosition,
    },
  });
}

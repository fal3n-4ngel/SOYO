import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

export interface SubtitleStream {
  index: number;
  codec: string;
  language: string;
  title: string;
  forced: boolean;
}

export interface AudioStream {
  index: number;
  codec: string;
  language: string;
  channels: number;
}

export interface MediaProbe {
  duration: number;
  width: number;
  height: number;
  videoCodec: string;
  audioCodec: string;
  bitrate: number;
  subtitles: SubtitleStream[];
  audios: AudioStream[];
}

/** Codecs an <video> element can play directly inside an MP4 container. */
const BROWSER_VIDEO = new Set(["h264", "avc1", "vp8", "vp9", "av1"]);
const BROWSER_AUDIO = new Set(["aac", "mp3", "opus", "vorbis", "flac"]);

const cache = new Map<string, { mtime: number; probe: MediaProbe }>();

export function probe(filePath: string): Promise<MediaProbe> {
  let mtime = 0;
  try {
    mtime = fs.statSync(filePath).mtimeMs;
  } catch {
    /* the caller will surface the missing file */
  }

  const cached = cache.get(filePath);
  if (cached && cached.mtime === mtime) return Promise.resolve(cached.probe);

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, ["-analyzeduration", "1000000", "-probesize", "1000000"], (err, data) => {
      if (err) return reject(err);

      const streams = data.streams ?? [];
      const video = streams.find((s) => s.codec_type === "video");
      const audio = streams.find((s) => s.codec_type === "audio");

      const result: MediaProbe = {
        duration: Number(data.format?.duration) || 0,
        width: video?.width ?? 0,
        height: video?.height ?? 0,
        videoCodec: (video?.codec_name ?? "").toLowerCase(),
        audioCodec: (audio?.codec_name ?? "").toLowerCase(),
        bitrate: Number(data.format?.bit_rate) || 0,
        subtitles: streams
          .filter((s) => s.codec_type === "subtitle")
          .map((s, i) => ({
            index: i,
            codec: (s.codec_name ?? "").toLowerCase(),
            language: (s.tags?.language as string) || "und",
            title: (s.tags?.title as string) || "",
            forced: Boolean(s.disposition?.forced),
          })),
        audios: streams
          .filter((s) => s.codec_type === "audio")
          .map((s, i) => ({
            index: i,
            codec: (s.codec_name ?? "").toLowerCase(),
            language: (s.tags?.language as string) || "und",
            channels: s.channels ?? 2,
          })),
      };

      cache.set(filePath, { mtime, probe: result });
      resolve(result);
    });
  });
}

export function probeSafe(filePath: string): Promise<MediaProbe | null> {
  return probe(filePath).catch(() => null);
}

/**
 * Decides how to serve a file.
 *
 * `direct`  – stream the bytes as-is with range support (instant seeking).
 * `remux`   – the codecs are browser-safe but the container is not (typical for
 *             h264/aac inside .mkv); rewrap with `-c copy`, which is nearly free.
 * `transcode` – the codecs themselves need re-encoding. Expensive, so it is the
 *             last resort rather than the default the old code used for all mkv.
 */
export function decideDelivery(
  extension: string,
  probeResult: MediaProbe | null
): "direct" | "remux" | "transcode" {
  const nativeContainer = [".mp4", ".m4v", ".webm", ".ogg"].includes(extension);

  if (!probeResult) return nativeContainer ? "direct" : "transcode";

  const videoOk = BROWSER_VIDEO.has(probeResult.videoCodec);
  const audioOk = !probeResult.audioCodec || BROWSER_AUDIO.has(probeResult.audioCodec);

  if (!videoOk || !audioOk) return "transcode";
  return nativeContainer ? "direct" : "remux";
}

export function isTextSubtitle(codec: string): boolean {
  return ["subrip", "srt", "ass", "ssa", "webvtt", "mov_text", "text"].includes(codec);
}

export function languageName(code: string): string {
  const names: Record<string, string> = {
    eng: "English", en: "English", jpn: "Japanese", ja: "Japanese",
    spa: "Spanish", es: "Spanish", fre: "French", fra: "French", fr: "French",
    ger: "German", deu: "German", de: "German", ita: "Italian", it: "Italian",
    por: "Portuguese", pt: "Portuguese", rus: "Russian", ru: "Russian",
    hin: "Hindi", hi: "Hindi", mal: "Malayalam", ml: "Malayalam",
    tam: "Tamil", ta: "Tamil", tel: "Telugu", te: "Telugu",
    kan: "Kannada", ara: "Arabic", ar: "Arabic", chi: "Chinese", zho: "Chinese",
    zh: "Chinese", kor: "Korean", ko: "Korean", und: "Unknown",
  };
  return names[code.toLowerCase()] ?? code.toUpperCase();
}

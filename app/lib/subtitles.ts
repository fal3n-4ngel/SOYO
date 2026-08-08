import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { isTextSubtitle, languageName, probeSafe } from "./media";

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  source: "file" | "embedded";
  default: boolean;
}

const vttCache = new Map<string, string>();
const SIDECAR_EXT = [".vtt", ".srt", ".ass", ".ssa", ".sub"];

/** Pulls a language tag out of names like "Movie.en.srt" or "Movie.eng.forced.srt". */
function guessLanguage(fileName: string, baseName: string): string {
  const rest = fileName.slice(baseName.length).replace(/\.[^.]+$/, "");
  const match = /[.\-_]([a-z]{2,3})(?:[.\-_]|$)/i.exec(rest);
  return match ? match[1].toLowerCase() : "und";
}

export function findSidecars(videoPath: string): { file: string; language: string }[] {
  const dir = path.dirname(videoPath);
  const baseName = path.parse(videoPath).name;

  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return [];
  }

  return entries
    .filter((name) => {
      if (!name.startsWith(baseName)) return false;
      return SIDECAR_EXT.includes(path.extname(name).toLowerCase());
    })
    .map((name) => ({
      file: path.join(dir, name),
      language: guessLanguage(name, baseName),
    }));
}

export async function listTracks(videoPath: string): Promise<SubtitleTrack[]> {
  const tracks: SubtitleTrack[] = [];

  findSidecars(videoPath).forEach((sidecar, index) => {
    const ext = path.extname(sidecar.file).replace(".", "").toUpperCase();
    tracks.push({
      id: `file:${index}`,
      label: `${languageName(sidecar.language)} (${ext})`,
      language: sidecar.language,
      source: "file",
      default: index === 0,
    });
  });

  const probeResult = await probeSafe(videoPath);
  for (const stream of probeResult?.subtitles ?? []) {
    // Bitmap subtitles (PGS/VobSub) cannot become WebVTT — skip rather than
    // offering a track that will silently fail.
    if (!isTextSubtitle(stream.codec)) continue;

    const name = stream.title || languageName(stream.language);
    tracks.push({
      id: `embedded:${stream.index}`,
      label: `${name}${stream.forced ? " (Forced)" : ""}`,
      language: stream.language,
      source: "embedded",
      default: tracks.length === 0,
    });
  }

  return tracks;
}

export function srtToVtt(data: string): string {
  const body = data
    .replace(/^﻿/, "")
    .replace(/\r\n/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${body}`;
}

/** Converts an embedded subtitle stream to WebVTT via ffmpeg. */
export function extractEmbedded(videoPath: string, streamIndex: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const command = ffmpeg(videoPath)
      .outputOptions(["-map", `0:s:${streamIndex}`, "-f", "webvtt"])
      .on("error", reject);

    const stream = command.pipe();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

export async function readTrack(videoPath: string, trackId: string): Promise<string | null> {
  const [source, rawIndex] = trackId.split(":");
  const index = Number(rawIndex);
  if (!Number.isInteger(index) || index < 0) return null;

  if (source === "file") {
    const sidecar = findSidecars(videoPath)[index];
    if (!sidecar) return null;

    const contents = fs.readFileSync(sidecar.file, "utf8");
    const ext = path.extname(sidecar.file).toLowerCase();

    if (ext === ".vtt") return contents.replace(/^﻿/, "");
    if (ext === ".srt" || ext === ".sub") return srtToVtt(contents);

    // ASS/SSA need a real conversion; let ffmpeg do it.
    return convertFile(sidecar.file);
  }

  if (source === "embedded") {
    const cacheKey = `embedded:${videoPath}:${index}`;
    if (vttCache.has(cacheKey)) return vttCache.get(cacheKey)!;

    const vtt = await extractEmbedded(videoPath, index);
    if (vtt) vttCache.set(cacheKey, vtt);
    return vtt;
  }

  return null;
}

function convertFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = ffmpeg(filePath).outputOptions(["-f", "webvtt"]).on("error", reject).pipe();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

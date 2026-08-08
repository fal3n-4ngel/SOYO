import fs from "fs";
import path from "path";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import { findMovieFile, getMovieMeta, getThumbnailDir } from "@/app/lib/serverUtils";
import { isUnlocked } from "@/app/lib/session";
import { getSettings } from "@/app/lib/db";
import { probeSafe } from "@/app/lib/media";

export const dynamic = "force-dynamic";

/** Cache key is derived from the name so odd filenames stay filesystem-safe. */
function cachePath(movieName: string): string {
  const hash = crypto.createHash("sha1").update(movieName).digest("hex").slice(0, 16);
  return path.join(getThumbnailDir(), `${hash}.jpg`);
}

/** De-duplicates concurrent generation — a grid of 60 tiles asks all at once. */
const inFlight = new Map<string, Promise<boolean>>();

function extractFrame(videoPath: string, outputPath: string, percent: number): Promise<boolean> {
  const existing = inFlight.get(outputPath);
  if (existing) return existing;

  const job = (async () => {
    const probeResult = await probeSafe(videoPath);
    const duration = probeResult?.duration ?? 0;
    // Seeking to a timestamp is far faster and more reliable than fluent's
    // percentage-based screenshots on large files.
    const seconds = duration > 0 ? Math.max(1, (duration * percent) / 100) : 5;

    return new Promise<boolean>((resolve) => {
      ffmpeg(videoPath)
        .inputOptions(["-ss", seconds.toFixed(2)])
        .outputOptions(["-frames:v 1", "-q:v 4", "-vf scale=-2:480"])
        .output(outputPath)
        .on("end", () => resolve(fs.existsSync(outputPath)))
        .on("error", () => resolve(false))
        .run();
    });
  })().finally(() => inFlight.delete(outputPath));

  inFlight.set(outputPath, job);
  return job;
}

function cleanMovieName(movieName: string): string {
  return movieName
    .replace(/\.[^.]+$/, "")
    .replace(/\[.*?\]|\(.*?\)/g, " ")
    .replace(
      /\b(720p|1080p|2160p|480p|4K|UHD|HDR|HEVC|x264|x265|AAC|AC3|DTS|WEB-?DL|WEBRip|BluRay|BRRip|HDRip|DVDRip|ESub|Dual|Audio|YIFY|YTS|AMZN|NF|PROPER|REPACK)\b/gi,
      " "
    )
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchArtwork(movieName: string): Promise<string | null> {
  const cleaned = cleanMovieName(movieName);
  if (!cleaned) return null;

  const omdbKey = process.env.IMDB_API_KEY || process.env.OMDB_API_KEY;
  if (omdbKey) {
    try {
      const { data } = await axios.get("https://www.omdbapi.com/", {
        params: { t: cleaned, apikey: omdbKey },
        timeout: 6000,
      });
      if (data?.Response === "True" && data.Poster && data.Poster !== "N/A") return data.Poster;
    } catch {
      /* fall through to AniList */
    }
  }

  try {
    const { data } = await axios.post(
      "https://graphql.anilist.co",
      {
        query: `query ($search: String) {
          Media(search: $search, type: ANIME) { coverImage { large } }
        }`,
        variables: { search: cleaned },
      },
      { headers: { "Content-Type": "application/json" }, timeout: 6000 }
    );
    return data?.data?.Media?.coverImage?.large ?? null;
  } catch {
    return null;
  }
}

async function downloadTo(url: string, destination: string): Promise<boolean> {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer", timeout: 10_000 });
    fs.writeFileSync(destination, Buffer.from(response.data));
    return true;
  } catch {
    return false;
  }
}

function placeholder(): NextResponse {
  const local = path.join(process.cwd(), "public", "default.jpg");
  if (fs.existsSync(local)) {
    const file = fs.createReadStream(local);
    return new NextResponse(Readable.toWeb(file) as ReadableStream, {
      status: 200,
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=60" },
    });
  }

  // No asset on disk — emit a neutral tile rather than a broken image.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
    <rect width="640" height="360" fill="#18181b"/>
    <text x="50%" y="52%" text-anchor="middle" fill="#52525b"
      font-family="system-ui, sans-serif" font-size="28" font-weight="600">soyo</text>
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ movie: string }> }
) {
  const { movie } = await params;
  const decoded = decodeURIComponent(movie);

  const meta = getMovieMeta(decoded);
  if (meta?.private && !(await isUnlocked())) return placeholder();

  const settings = getSettings();
  const target = cachePath(decoded);

  if (!fs.existsSync(target)) {
    if (!settings.thumbnailsEnabled) return placeholder();

    const videoPath = findMovieFile(decoded);
    let generated = false;

    if (videoPath) {
      generated = await extractFrame(videoPath, target, settings.thumbnailTimemark);
    }

    if (!generated && settings.externalArtwork) {
      const url = await fetchArtwork(decoded);
      if (url) generated = await downloadTo(url, target);
    }

    if (!generated) return placeholder();
  }

  const stat = fs.statSync(target);
  const file = fs.createReadStream(target);

  return new NextResponse(Readable.toWeb(file) as ReadableStream, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(stat.size),
      // Cached thumbnails are content-addressed by name; safe to cache hard.
      "Cache-Control": "public, max-age=86400",
    },
  });
}

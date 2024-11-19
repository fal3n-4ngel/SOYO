import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import path from "path";
import { readConfig } from '@/app/lib/serverUtils';

function getMovieDir() {
const config = readConfig();
return config.movieDir || process.env.MOVIE_DIR || 'F:/';
}

export async function GET(
request: NextRequest,
{ params }: { params: { movie: string } }
) {
const movieDir = getMovieDir();
const { movie } = params;
const movieNameWithoutExtension = movie.split(".").slice(0, -1).join(".");

const thumbnailPath = path.join(movieDir, 'thumbnails', `${movieNameWithoutExtension}.jpg`);
const defaultThumbnailPath = path.join(process.cwd(), 'public', 'default.jpg');

const thumbnailFile = fs.existsSync(thumbnailPath) 
  ? thumbnailPath 
  : defaultThumbnailPath;

const thumbnailStat = fs.statSync(thumbnailFile);
const thumbnailFileSize = thumbnailStat.size;
const thumbnailRange = request.headers.get("range");

if (thumbnailRange) {
  const parts = thumbnailRange.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : thumbnailFileSize - 1;
  const chunksize = end - start + 1;
  const file = fs.createReadStream(thumbnailFile, { start, end });
  const head = {
    "Content-Range": `bytes ${start}-${end}/${thumbnailFileSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": chunksize.toString(),
    "Content-Type": "image/jpeg",
  };
  return new NextResponse(Readable.toWeb(file) as ReadableStream, {
    status: 206,
    headers: head,
  });
} else {
  const head = {
    "Content-Length": thumbnailFileSize.toString(),
    "Content-Type": "image/jpeg",
  };
  const file = fs.createReadStream(thumbnailFile);
  return new NextResponse(Readable.toWeb(file) as ReadableStream, {
    status: 200,
    headers: head,
  });
}
}
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

const MOVIE_DIR = "F:/";
// function for fetching the thumbnail images.
export async function GET(
  request: NextRequest,
  { params }: { params: { movie: string } }
) {
  const { movie } = params;
  const movieNameWithoutExtension = movie.split(".").slice(0, -1).join(".");

  const thumbnailPath = `${MOVIE_DIR}/thumbnails/${movieNameWithoutExtension}.jpg`;

  if (fs.existsSync(thumbnailPath)) {
    const thumbnailStat = fs.statSync(thumbnailPath);
    const thumbnailFileSize = thumbnailStat.size;
    const thumbnailRange = request.headers.get("range");

    if (thumbnailRange) {
      const parts = thumbnailRange.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : thumbnailFileSize - 1;
      const chunksize = end - start + 1;
      const thumbnailFile = fs.createReadStream(thumbnailPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${thumbnailFileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": "image/jpeg",
      };
      return new NextResponse(Readable.toWeb(thumbnailFile) as ReadableStream, {
        status: 206,
        headers: head,
      });
    } else {
      const head = {
        "Content-Length": thumbnailFileSize.toString(),
        "Content-Type": "image/jpeg",
      };
      const thumbnailFile = fs.createReadStream(thumbnailPath);
      return new NextResponse(Readable.toWeb(thumbnailFile) as ReadableStream, {
        status: 200,
        headers: head,
      });
    }
  } else {
    const head = {
      
      "Content-Type": "image/jpeg",
    };
    const thumbnailFile = fs.createReadStream("F:/thumbnails/default.jpg");
    return new NextResponse(Readable.toWeb(thumbnailFile) as ReadableStream, {
      status: 200,
      headers: head,
    });
  }
}

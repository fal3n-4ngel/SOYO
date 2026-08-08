import { NextRequest, NextResponse } from "next/server";
import { getTorrent } from "@/app/lib/torrentEngine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get("hash");
    const fileIndex = parseInt(searchParams.get("file") || "0", 10);

    if (!hash) {
      return NextResponse.json({ error: "Torrent info hash is required" }, { status: 400 });
    }

    const torrent = await getTorrent(hash);
    if (!torrent || !torrent.files || torrent.files.length === 0) {
      return NextResponse.json({ error: "Torrent not found or metadata not loaded" }, { status: 404 });
    }

    // Pick requested video file or default to largest file
    let file = torrent.files[fileIndex];
    if (!file) {
      file = torrent.files.reduce((max: any, f: any) => (f.length > max.length ? f : max), torrent.files[0]);
    }

    const fileSize = file.length;
    const range = request.headers.get("range");

    let start = 0;
    let end = fileSize - 1;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    }

    const chunksize = end - start + 1;
    const stream = file.createReadStream({ start, end });

    // Convert Node.js ReadableStream to Web ReadableStream for NextResponse
    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err: any) => controller.error(err));
      },
      cancel() {
        stream.destroy();
      },
    });

    let contentType = "video/mp4";
    const nameLower = file.name.toLowerCase();
    if (nameLower.endsWith(".webm")) contentType = "video/webm";
    else if (nameLower.endsWith(".ogg") || nameLower.endsWith(".ogv")) contentType = "video/ogg";
    else if (nameLower.endsWith(".mkv")) contentType = "video/mp4"; // Serve MP4/H.264 stream container for MKV in HTML5 video

    return new NextResponse(webStream, {
      status: range ? 206 : 200,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": contentType,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[soyo] Torrent stream error:", error);
    return NextResponse.json({ error: "Torrent stream failed" }, { status: 500 });
  }
}

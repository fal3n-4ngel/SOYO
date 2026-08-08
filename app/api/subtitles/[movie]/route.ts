import { NextRequest, NextResponse } from "next/server";
import { findMovieFile } from "@/app/lib/serverUtils";
import { listTracks, readTrack } from "@/app/lib/subtitles";

export const dynamic = "force-dynamic";

/**
 * `?list=1`   → JSON of every sidecar and embedded text track.
 * `?track=id` → that track as WebVTT.
 * no params   → the first available track, so a bare <track src> still works.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ movie: string }> }
) {
  const { movie } = await params;
  const videoPath = findMovieFile(decodeURIComponent(movie));

  const { searchParams } = new URL(request.url);
  const wantsList = searchParams.get("list") === "1";

  if (!videoPath) {
    return wantsList
      ? NextResponse.json({ tracks: [] })
      : new NextResponse("Subtitles not found", { status: 404 });
  }

  if (wantsList) {
    try {
      return NextResponse.json({ tracks: await listTracks(videoPath) });
    } catch {
      return NextResponse.json({ tracks: [] });
    }
  }

  try {
    let trackId = searchParams.get("track");

    if (!trackId) {
      const tracks = await listTracks(videoPath);
      if (tracks.length === 0) return new NextResponse("Subtitles not found", { status: 404 });
      trackId = tracks[0].id;
    }

    const vtt = await readTrack(videoPath, trackId);
    if (!vtt) return new NextResponse("Subtitles not found", { status: 404 });

    return new NextResponse(vtt, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[soyo] Subtitle extraction failed:", error);
    return new NextResponse("Subtitles not found", { status: 404 });
  }
}

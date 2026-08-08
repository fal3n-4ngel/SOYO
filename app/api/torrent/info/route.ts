import { NextRequest, NextResponse } from "next/server";
import { addTorrent } from "@/app/lib/torrentEngine";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { magnet } = await request.json();

    if (!magnet || typeof magnet !== "string" || !magnet.trim()) {
      return NextResponse.json({ error: "Magnet link or torrent URL is required" }, { status: 400 });
    }

    const details = await addTorrent(magnet.trim());
    return NextResponse.json({ details });
  } catch (error) {
    console.error("[soyo] Torrent info error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to parse torrent" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  clearProgress,
  getProgress,
  readDB,
  toggleFavorite,
  updateProgress,
} from "@/app/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const movie = searchParams.get("movie");

  if (!movie) {
    // No movie: return the whole watch history, newest first.
    const db = readDB();
    const history = Object.entries(db.progress)
      .map(([name, entry]) => ({ name, ...entry }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return NextResponse.json({ history, favorites: db.favorites });
  }

  const entry = getProgress(movie);
  return NextResponse.json({
    // `progress` keeps the old numeric shape working.
    progress: entry?.time ?? 0,
    entry,
    favorite: readDB().favorites.includes(movie),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { movie, timeInSeconds, duration, action } = body;

    if (typeof movie !== "string" || !movie) {
      return NextResponse.json({ error: "Missing movie" }, { status: 400 });
    }

    if (action === "favorite") {
      return NextResponse.json({ success: true, favorite: toggleFavorite(movie) });
    }

    if (action === "reset") {
      clearProgress(movie);
      return NextResponse.json({ success: true });
    }

    if (action === "complete") {
      const existing = getProgress(movie);
      const total = Number(duration) || existing?.duration || 0;
      updateProgress(movie, total, total);
      return NextResponse.json({ success: true });
    }

    if (typeof timeInSeconds !== "number" || !Number.isFinite(timeInSeconds)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const entry = updateProgress(
      movie,
      Math.max(0, timeInSeconds),
      Number.isFinite(duration) ? Number(duration) : 0
    );

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error("[soyo] Failed to update progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const movie = searchParams.get("movie");
  clearProgress(movie ?? undefined);
  return NextResponse.json({ success: true });
}

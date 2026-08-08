import { NextRequest, NextResponse } from "next/server";
import { getLibraryStats, scanLibrary } from "@/app/lib/serverUtils";
import { clearProgress, readDB, updateDB } from "@/app/lib/db";
import fs from "fs";
import path from "path";
import { getThumbnailDir } from "@/app/lib/serverUtils";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ stats: getLibraryStats() });
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === "rescan") {
      const movies = await scanLibrary();
      return NextResponse.json({ success: true, count: movies.length, stats: getLibraryStats() });
    }

    if (action === "clear-thumbnails") {
      const dir = getThumbnailDir();
      let removed = 0;
      for (const file of fs.readdirSync(dir)) {
        if (file.endsWith(".jpg")) {
          fs.unlinkSync(path.join(dir, file));
          removed++;
        }
      }
      return NextResponse.json({ success: true, removed });
    }

    if (action === "clear-progress") {
      clearProgress();
      return NextResponse.json({ success: true });
    }

    if (action === "clear-favorites") {
      updateDB((db) => {
        db.favorites = [];
      });
      return NextResponse.json({ success: true });
    }

    if (action === "export") {
      const db = readDB();
      return NextResponse.json({
        exportedAt: new Date().toISOString(),
        progress: db.progress,
        favorites: db.favorites,
        settings: { ...db.settings, pin: undefined },
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[soyo] Library action failed:", error);
    return NextResponse.json({ error: "Library action failed" }, { status: 500 });
  }
}

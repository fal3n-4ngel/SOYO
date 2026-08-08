import { NextRequest, NextResponse } from "next/server";
import { getLibrary, getLibraryStats } from "@/app/lib/serverUtils";
import { isUnlocked } from "@/app/lib/session";
import { readDB, getSettings, type MovieMeta, type SortKey } from "@/app/lib/db";

export const dynamic = "force-dynamic";

interface MovieDTO extends MovieMeta {
  favorite: boolean;
  progress: number;
  duration: number;
  watchedAt: number | null;
  completed: boolean;
}

function sortMovies(movies: MovieDTO[], key: SortKey): MovieDTO[] {
  const sorted = [...movies];
  switch (key) {
    case "added":
      return sorted.sort((a, b) => b.mtime - a.mtime);
    case "size":
      return sorted.sort((a, b) => b.size - a.size);
    case "recent":
      return sorted.sort((a, b) => (b.watchedAt ?? 0) - (a.watchedAt ?? 0));
    case "name":
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unlocked = await isUnlocked();
    const settings = getSettings();
    const db = readDB();

    const library = await getLibrary(unlocked);

    let movies: MovieDTO[] = library.map((movie) => {
      const entry = db.progress[movie.name];
      return {
        ...movie,
        // fullPath is a server detail; don't ship it to the browser.
        fullPath: "",
        favorite: db.favorites.includes(movie.name),
        progress: entry?.time ?? 0,
        duration: entry?.duration ?? 0,
        watchedAt: entry?.updatedAt ?? null,
        completed: entry?.completed ?? false,
      };
    });

    // --- filters -----------------------------------------------------------
    const search = searchParams.get("q")?.trim().toLowerCase();
    if (search) {
      movies = movies.filter(
        (m) => m.name.toLowerCase().includes(search) || m.folder.toLowerCase().includes(search)
      );
    }

    const folder = searchParams.get("folder");
    if (folder) movies = movies.filter((m) => m.folder === folder);

    const format = searchParams.get("format");
    if (format) movies = movies.filter((m) => m.format === format);

    if (searchParams.get("favorites") === "1") movies = movies.filter((m) => m.favorite);

    // --- ordering ----------------------------------------------------------
    const sort = (searchParams.get("sort") as SortKey) || settings.defaultSort;
    movies = sortMovies(movies, sort);
    if (searchParams.get("order") === "asc" && sort !== "name") movies.reverse();

    const limit = Number(searchParams.get("limit"));
    const total = movies.length;
    if (Number.isFinite(limit) && limit > 0) movies = movies.slice(0, limit);

    // --- derived rails -----------------------------------------------------
    const continueWatching = sortMovies(
      movies.filter((m) => m.progress > 30 && !m.completed),
      "recent"
    ).slice(0, 12);

    const folders = [...new Set(library.map((m) => m.folder).filter(Boolean))].sort();
    const formats = [...new Set(library.map((m) => m.format))].sort();

    return NextResponse.json({
      movies,
      total,
      continueWatching,
      folders,
      formats,
      isUnlocked: unlocked,
      hasPin: settings.pin !== null,
      stats: getLibraryStats(),
    });
  } catch (error) {
    console.error("[soyo] Error fetching movies:", error);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
  }
}

"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownWideNarrow,
  Folder,
  Heart,
  LayoutGrid,
  List,
  Play,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Nav from "@/app/components/Nav";
import MovieCard from "@/app/components/MovieCard";
import MediaRail from "@/app/components/MediaRail";
import PinModal from "@/app/components/PinModal";
import DynamicThumbnail from "@/app/components/DynamicThumbnail";
import {
  formatBytes,
  formatDuration,
  formatRelative,
  prettyTitle,
  type Movie,
  type MoviesResponse,
} from "@/app/lib/types";
import { parseMediaInfo } from "@/app/lib/mediaParser";

type SortKey = "name" | "added" | "size" | "recent";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "A–Z" },
  { key: "added", label: "Newest" },
  { key: "size", label: "Largest" },
  { key: "recent", label: "Last played" },
];

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<MoviesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>((searchParams.get("sort") as SortKey) || "name");
  const [folder, setFolder] = useState(searchParams.get("folder") ?? "");
  const [format, setFormat] = useState(searchParams.get("format") ?? "");
  const [quality, setQuality] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(searchParams.get("favorites") === "1");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const stored = localStorage.getItem("soyo-view");
    if (stored === "grid" || stored === "list") setView(stored);
  }, []);

  const setViewMode = (next: "grid" | "list") => {
    setView(next);
    localStorage.setItem("soyo-view", next);
  };

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/movies");
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      setData(await response.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtering happens client-side: the whole index is already in memory, so
  // typing stays instant instead of round-tripping per keystroke.
  const movies = useMemo(() => {
    if (!data) return [];
    let result = [...data.movies];

    const needle = query.trim().toLowerCase();
    if (needle) {
      result = result.filter(
        (m) => {
          const parsed = parseMediaInfo(m.name);
          return (
            m.name.toLowerCase().includes(needle) ||
            parsed.cleanTitle.toLowerCase().includes(needle) ||
            m.folder.toLowerCase().includes(needle)
          );
        }
      );
    }
    if (folder) result = result.filter((m) => m.folder === folder);
    if (format) result = result.filter((m) => m.format === format);
    if (quality) {
      result = result.filter((m) => parseMediaInfo(m.name).resolution === quality);
    }
    if (favoritesOnly) result = result.filter((m) => m.favorite);

    switch (sort) {
      case "added":
        result.sort((a, b) => b.mtime - a.mtime);
        break;
      case "size":
        result.sort((a, b) => b.size - a.size);
        break;
      case "recent":
        result.sort((a, b) => (b.watchedAt ?? 0) - (a.watchedAt ?? 0));
        break;
      default:
        result.sort((a, b) =>
          parseMediaInfo(a.name).cleanTitle.localeCompare(parseMediaInfo(b.name).cleanTitle, undefined, {
            numeric: true,
          })
        );
    }

    return result;
  }, [data, query, folder, format, quality, favoritesOnly, sort]);

  const toggleFavorite = useCallback(async (name: string) => {
    setData((current) =>
      current
        ? {
            ...current,
            movies: current.movies.map((m) =>
              m.name === name ? { ...m, favorite: !m.favorite } : m
            ),
          }
        : current
    );

    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie: name, action: "favorite" }),
    }).catch(() => undefined);
  }, []);

  const lock = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lock" }),
    });
    load();
  };

  const clearFilters = () => {
    setQuery("");
    setFolder("");
    setFormat("");
    setQuality("");
    setFavoritesOnly(false);
    router.replace("/browse");
  };

  const activeFilters = [folder, format, quality, favoritesOnly ? "fav" : ""].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-bg">
      <Nav
        isUnlocked={data?.isUnlocked}
        hasPin={data?.hasPin}
        onUnlock={() => setShowPin(true)}
        onLock={lock}
      />
      <PinModal open={showPin} onClose={() => setShowPin(false)} onUnlocked={load} />

      {/* --------------------------------------------------------- Toolbar */}
      <div className="sticky top-[var(--nav-height)] z-40 border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto max-w-[1800px] px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles and folders…"
                className="field pl-10"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-subtle hover:text-fg"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters((value) => !value)}
              data-active={showFilters || activeFilters > 0}
              className="chip h-[42px] px-3.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilters > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[9px] text-accent-fg">
                  {activeFilters}
                </span>
              )}
            </button>

            <div className="hidden items-center rounded-lg border border-line p-0.5 sm:flex">
              <button
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
                className={`rounded-md p-2 transition-colors ${
                  view === "grid" ? "bg-inset text-fg" : "text-subtle hover:text-fg"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                aria-label="List view"
                className={`rounded-md p-2 transition-colors ${
                  view === "list" ? "bg-inset text-fg" : "text-subtle hover:text-fg"
                }`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow mr-1 flex items-center gap-1.5">
                  <ArrowDownWideNarrow className="h-3 w-3" /> Sort
                </span>
                {SORTS.map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setSort(option.key)}
                    data-active={sort === option.key}
                    className="chip"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow mr-1">Quality</span>
                {["1080P", "720P", "480P", "4K"].map((val) => (
                  <button
                    key={val}
                    onClick={() => setQuality(quality === val ? "" : val)}
                    data-active={quality === val}
                    className="chip"
                  >
                    {val}
                  </button>
                ))}
              </div>

              {data && data.formats.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow mr-1">Format</span>
                  {data.formats.map((value) => (
                    <button
                      key={value}
                      onClick={() => setFormat(format === value ? "" : value)}
                      data-active={format === value}
                      className="chip"
                    >
                      {value.replace(".", "")}
                    </button>
                  ))}
                </div>
              )}

              {data && data.folders.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="eyebrow mr-1 flex items-center gap-1.5">
                    <Folder className="h-3 w-3" /> Folder
                  </span>
                  <div className="scrollbar-none flex max-w-full gap-2 overflow-x-auto pb-1">
                    {data.folders.slice(0, 40).map((value) => (
                      <button
                        key={value}
                        onClick={() => setFolder(folder === value ? "" : value)}
                        data-active={folder === value}
                        className="chip"
                        title={value}
                      >
                        {value.split("/").pop()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFavoritesOnly((value) => !value)}
                  data-active={favoritesOnly}
                  className="chip"
                >
                  <Heart className={`h-3 w-3 ${favoritesOnly ? "fill-current" : ""}`} />
                  Favourites
                </button>
                {(activeFilters > 0 || query) && (
                  <button onClick={clearFilters} className="chip">
                    <X className="h-3 w-3" /> Clear all
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- Results */}
      <main className="mx-auto max-w-[1800px] px-5 py-8 sm:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            {favoritesOnly ? "Favourites" : folder ? folder.split("/").pop() : "Library"}
          </h1>
          <span className="eyebrow">
            {movies.length} {movies.length === 1 ? "title" : "titles"}
          </span>
        </div>

        {error && (
          <div className="surface p-6">
            <h3 className="font-bold text-danger">Couldn&apos;t load the library</h3>
            <p className="mt-1.5 text-sm text-muted">{error}</p>
            <button onClick={load} className="btn btn-ghost mt-4">
              Retry
            </button>
          </div>
        )}

        {/* Featured Rails (rendered when no active search/filters) */}
        {data && !query && !folder && !format && !quality && !favoritesOnly && (
          <div className="mb-6 space-y-2">
            {data.trending && data.trending.length > 0 && (
              <MediaRail title="Trending Now" icon="🔥" movies={data.trending} onToggleFavorite={toggleFavorite} />
            )}
            {data.mostWatched && data.mostWatched.length > 0 && (
              <MediaRail title="Most Watched" icon="👁️" movies={data.mostWatched} onToggleFavorite={toggleFavorite} />
            )}
            {data.recentlyAdded && data.recentlyAdded.length > 0 && (
              <MediaRail title="Recently Added" icon="🆕" movies={data.recentlyAdded} onToggleFavorite={toggleFavorite} />
            )}
          </div>
        )}
        {!data && !error && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 15 }).map((_, index) => (
              <div key={index} className="aspect-video rounded-xl skeleton" />
            ))}
          </div>
        )}

        {data && movies.length === 0 && (
          <div className="surface px-8 py-16 text-center">
            <h3 className="text-lg font-bold text-fg">Nothing matches</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              {data.movies.length === 0
                ? "Your library is empty. Add a media folder in Settings."
                : "Try a different search or clear the filters."}
            </p>
            {data.movies.length === 0 ? (
              <Link href="/config" className="btn btn-primary mt-6">
                Open settings
              </Link>
            ) : (
              <button onClick={clearFilters} className="btn btn-ghost mt-6">
                Clear filters
              </button>
            )}
          </div>
        )}

        {view === "grid" && movies.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {movies.map((movie) => (
              <MovieCard key={movie.name} movie={movie} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}

        {view === "list" && movies.length > 0 && (
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-elevated">
            {movies.map((movie) => (
              <MovieRow key={movie.name} movie={movie} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MovieRow({
  movie,
  onToggleFavorite,
}: {
  movie: Movie;
  onToggleFavorite: (name: string) => void;
}) {
  const percent = movie.duration > 0 ? Math.min(100, (movie.progress / movie.duration) * 100) : 0;

  return (
    <div className="group flex items-center gap-4 p-3 transition-colors hover:bg-inset">
      <Link
        href={`/stream/${encodeURIComponent(movie.name)}`}
        className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg sm:w-36"
      >
        <DynamicThumbnail movieName={movie.name} thumbnailUrl={movie.thumbnail} preview={false} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Play className="h-5 w-5 fill-white text-white" />
        </span>
        {percent > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black/40">
            <span className="block h-full bg-accent" style={{ width: `${percent}%` }} />
          </span>
        )}
      </Link>

      <Link href={`/stream/${encodeURIComponent(movie.name)}`} className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold text-fg">{prettyTitle(movie.name)}</h4>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-subtle">
          {movie.folder && <span className="truncate">{movie.folder}</span>}
          <span>{movie.format.replace(".", "")}</span>
          <span>{formatBytes(movie.size)}</span>
          {movie.duration > 0 && <span>{formatDuration(movie.duration)}</span>}
          {movie.watchedAt && <span>Played {formatRelative(movie.watchedAt)}</span>}
        </div>
      </Link>

      <button
        onClick={() => onToggleFavorite(movie.name)}
        aria-label={movie.favorite ? "Remove from favourites" : "Add to favourites"}
        className={`shrink-0 rounded-lg p-2 transition-colors ${
          movie.favorite ? "text-danger" : "text-subtle hover:text-fg"
        }`}
      >
        <Heart className={`h-4 w-4 ${movie.favorite ? "fill-current" : ""}`} />
      </button>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <BrowseContent />
    </Suspense>
  );
}

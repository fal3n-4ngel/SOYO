"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { Bookmark, Lock, Play } from "lucide-react";
import DynamicThumbnail from "./DynamicThumbnail";
import { formatBytes, formatDuration, prettyTitle, type Movie } from "@/app/lib/types";
import { parseMediaInfo } from "@/app/lib/mediaParser";

interface MovieCardProps {
  movie: Movie;
  hoverPreview?: boolean;
  onToggleFavorite?: (name: string) => void;
  /** `wide` is 16:9 for rails, `poster` is 2:3 for the grid. */
  shape?: "wide" | "poster";
  /** Subtle cursor-tracked tilt — on by default, the browse grid leans on it most. */
  tilt?: boolean;
}

const TILT_MAX_DEG = 5;

export default function MovieCard({
  movie,
  hoverPreview = true,
  onToggleFavorite,
  shape = "wide",
  tilt = true,
}: MovieCardProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const canTilt = useRef(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    canTilt.current =
      tilt &&
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, [tilt]);

  const handleMove = useCallback((event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!canTilt.current) return;
    const el = linkRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(700px) rotateX(${(-py * TILT_MAX_DEG).toFixed(2)}deg) rotateY(${(px * TILT_MAX_DEG).toFixed(2)}deg) translateY(-4px)`;
    });
  }, []);

  const handleLeave = useCallback(() => {
    if (frame.current) cancelAnimationFrame(frame.current);
    const el = linkRef.current;
    if (el) el.style.transform = "";
  }, []);

  const percent =
    movie.duration > 0 ? Math.min(100, (movie.progress / movie.duration) * 100) : 0;

  return (
    <div className="group relative" style={{ perspective: 700 }}>
      <Link
        ref={linkRef}
        href={`/stream/${encodeURIComponent(movie.name)}`}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="block overflow-hidden rounded-xl border border-line bg-elevated hover:border-line-strong hover:shadow-xl tap-highlight-none"
        style={{
          boxShadow: "0 1px 2px var(--shadow-color)",
          transition: "transform 0.15s ease-out, box-shadow 0.3s ease, border-color 0.3s ease",
        }}
      >
        <div className={`relative w-full ${shape === "wide" ? "aspect-video" : "aspect-[2/3]"}`}>
          <DynamicThumbnail
            movieName={movie.name}
            thumbnailUrl={movie.thumbnail}
            preview={hoverPreview}
            imgClassName="group-hover:scale-[1.04] transition-transform duration-500"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95 shadow-lg">
              <Play className="ml-0.5 h-5 w-5 fill-black text-black" />
            </span>
          </div>

          {movie.private && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white backdrop-blur">
              <Lock className="h-2.5 w-2.5" /> Private
            </span>
          )}

          {movie.completed && (
            <span className="absolute right-2 top-2 rounded-md bg-success px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
              Watched
            </span>
          )}

          {percent > 0 && !movie.completed && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
              <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>

        <div className="p-3">
          {(() => {
            const parsed = parseMediaInfo(movie.name);
            return (
              <>
                <h4 className="line-clamp-2 text-[13px] font-semibold leading-snug text-fg">
                  {parsed.cleanTitle}
                </h4>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                  {parsed.year && (
                    <span className="rounded bg-inset px-1.5 py-0.5 border border-line text-fg">
                      {parsed.year}
                    </span>
                  )}
                  {parsed.resolution && (
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent-fg border border-accent/30 font-extrabold">
                      {parsed.resolution}
                    </span>
                  )}
                  {parsed.source && (
                    <span className="rounded bg-inset px-1.5 py-0.5 border border-line text-subtle">
                      {parsed.source}
                    </span>
                  )}
                  <span className="rounded bg-inset px-1.5 py-0.5 border border-line text-subtle">
                    {movie.format.replace(".", "")}
                  </span>
                  <span>{formatBytes(movie.size)}</span>
                  {movie.duration > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{formatDuration(movie.duration)}</span>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </Link>

      {onToggleFavorite && (
        <button
          onClick={(event) => {
            event.preventDefault();
            onToggleFavorite(movie.name);
          }}
          aria-label={movie.favorite ? "Remove from favourites" : "Add to favourites"}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg shadow-md backdrop-blur transition-all duration-200 ${
            movie.favorite
              ? "scale-100 bg-accent text-accent-fg opacity-100"
              : "scale-90 bg-black/55 text-white opacity-0 group-hover:scale-100 group-hover:opacity-100"
          } ${movie.completed ? "top-11" : ""}`}
        >
          <Bookmark className={`h-3.5 w-3.5 ${movie.favorite ? "fill-current" : ""}`} />
        </button>
      )}
    </div>
  );
}

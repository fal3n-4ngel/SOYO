"use client";

import MovieCard from "./MovieCard";
import type { Movie } from "@/app/lib/types";

interface MediaRailProps {
  title: string;
  icon?: string;
  movies: Movie[];
  onToggleFavorite?: (name: string) => void;
}

export default function MediaRail({ title, icon, movies, onToggleFavorite }: MediaRailProps) {
  if (!movies || movies.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-fg">
          {icon && <span>{icon}</span>}
          {title}
        </h3>
        <span className="eyebrow">{movies.length} items</span>
      </div>

      <div className="scrollbar-none flex max-w-full gap-4 overflow-x-auto pb-3 pt-1">
        {movies.map((movie) => (
          <div key={movie.name} className="w-[200px] shrink-0 sm:w-[240px]">
            <MovieCard movie={movie} onToggleFavorite={onToggleFavorite} />
          </div>
        ))}
      </div>
    </div>
  );
}

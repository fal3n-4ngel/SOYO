"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Library, Play } from "lucide-react";
import Nav from "./Nav";
import PinModal from "./PinModal";
import ConnectPanel from "./ConnectPanel";
import FloatingCollage from "./FloatingCollage";
import type { MoviesResponse } from "@/app/lib/types";

export default function MovieList() {
  const [data, setData] = useState<MoviesResponse | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [collageImages, setCollageImages] = useState<string[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/movies");
      if (response.ok) setData(await response.json());
    } catch {
      // Degrades gracefully
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/landing-images")
      .then((response) => response.json())
      .then((json) => setCollageImages(json.images ?? []))
      .catch(() => undefined);
  }, []);

  const lock = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lock" }),
    });
    load();
  };

  const movies = useMemo(() => data?.movies ?? [], [data]);
  const resumeTarget = data?.continueWatching[0] ?? movies[0];

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Nav
        isUnlocked={data?.isUnlocked}
        hasPin={data?.hasPin}
        onUnlock={() => setShowPin(true)}
        onLock={lock}
      />

      <PinModal open={showPin} onClose={() => setShowPin(false)} onUnlocked={load} />

      {/* Hero */}
      <header className="relative flex-1 flex flex-col justify-center items-center overflow-hidden min-h-[calc(100vh-var(--nav-height))]">
        {collageImages.length > 0 && <FloatingCollage images={collageImages} />}

        <div className="relative z-10 mx-auto flex flex-col items-center justify-center px-5 py-12 text-center sm:px-8 max-w-2xl">
          <span className="mb-4 text-xs font-mono font-semibold uppercase tracking-[0.25em] text-muted">
            Stream On Your Own
          </span>

          <h1 className="text-[clamp(3.5rem,8vw,5.5rem)] font-normal leading-none tracking-tight text-fg font-sans">
            SOYO
          </h1>

          <p className="mt-4 max-w-md text-balance text-lg font-normal leading-relaxed text-muted font-sans">
            Your media, on every screen in the house. Nothing uploaded, nothing tracked, no account.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/browse" className="btn btn-accent">
              <Library className="h-3.5 w-3.5" />
              Browse library
            </Link>
            {resumeTarget && (
              <Link
                href={`/stream/${encodeURIComponent(resumeTarget.name)}`}
                className="btn btn-ghost"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {data?.continueWatching[0] ? "Resume" : "Start watching"}
              </Link>
            )}
          </div>

          <div className="mt-8 w-full max-w-xs">
            <ConnectPanel compact />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-6 hidden text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-subtle sm:block">
          Local network only
        </div>
      </header>

      <footer className="border-t border-line relative z-10 bg-bg">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-3 px-5 py-6 sm:px-8">
          <span className="eyebrow">© {new Date().getFullYear()} SOYO — Stream On Your Own</span>
          <a
            href="https://github.com/fal3n-4ngel/SOYO"
            target="_blank"
            rel="noreferrer"
            className="eyebrow transition-colors hover:text-fg"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

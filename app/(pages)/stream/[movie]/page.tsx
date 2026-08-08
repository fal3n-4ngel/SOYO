"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Folder, Heart, Info, Magnet, Play, RotateCcw } from "lucide-react";
import Nav from "@/app/components/Nav";
import VideoPlayer, { type MediaInfo } from "@/app/components/VideoPlayer";
import DynamicThumbnail from "@/app/components/DynamicThumbnail";
import {
  formatBytes,
  formatDuration,
  prettyTitle,
  type Movie,
  type MoviesResponse,
} from "@/app/lib/types";

export default function StreamPage({ params }: { params: Promise<{ movie: string }> }) {
  const { movie } = use(params);
  const name = decodeURIComponent(movie);
  const router = useRouter();
  const searchParams = useSearchParams();
  const torrentUrl = searchParams.get("torrentUrl");

  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [library, setLibrary] = useState<MoviesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (torrentUrl) {
      setInfo({
        name,
        streamUrl: torrentUrl,
        folder: "Torrent",
        format: ".mp4",
        size: 0,
        delivery: "direct",
        seekable: true,
        subtitles: [],
        progress: { time: 0, duration: 0, completed: false },
        next: null,
        settings: {
          autoplay: true,
          autoplayNext: false,
          defaultVolume: 0.8,
          seekStep: 10,
          rememberPosition: false,
        },
        probe: null,
      });
      return;
    }

    fetch(`/api/media/${encodeURIComponent(name)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load this title");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setFavorite(data.favorite);
      })
      .catch((err) => !cancelled && setError(err.message));

    fetch("/api/movies")
      .then((response) => response.json())
      .then((data) => !cancelled && setLibrary(data))
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [name, torrentUrl]);

  const toggleFavorite = useCallback(async () => {
    setFavorite((value) => !value);
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie: name, action: "favorite" }),
    }).catch(() => undefined);
  }, [name]);

  const handleEnded = useCallback(() => {
    if (info?.settings.autoplayNext && info.next) {
      router.push(`/stream/${encodeURIComponent(info.next.name)}`);
    }
  }, [info, router]);

  // "Up next" prefers the same folder, then falls back to anything unwatched.
  const upNext: Movie[] = (() => {
    if (!library) return [];
    const others = library.movies.filter((m) => m.name !== name);
    const sameFolder = others.filter((m) => m.folder === (library.movies.find((x) => x.name === name)?.folder ?? ""));
    return (sameFolder.length > 0 ? sameFolder : others).slice(0, 8);
  })();

  if (error) {
    return (
      <div className="min-h-screen bg-bg">
        <Nav />
        <div className="mx-auto max-w-lg px-5 py-24 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-fg">Can&apos;t play this</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <Link href="/browse" className="btn btn-primary mt-7">
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  const probe = info?.probe;

  return (
    <div className="min-h-screen bg-bg">
      <Nav isUnlocked={library?.isUnlocked} hasPin={library?.hasPin} />

      <main className="mx-auto max-w-[1800px] px-5 py-6 sm:px-8">
        <Link
          href="/browse"
          className="mb-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-subtle transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-3 w-3" /> Library
        </Link>

        <div className="flex flex-col gap-8 xl:flex-row">
          <div className="min-w-0 flex-1">
            {info ? (
              <VideoPlayer movie={name} info={info} onEnded={handleEnded} />
            ) : (
              <div className="aspect-video w-full rounded-2xl skeleton" />
            )}

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight tracking-tight text-fg sm:text-3xl">
                  {prettyTitle(name)}
                </h1>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-bold uppercase tracking-widest text-subtle">
                  {info?.folder && (
                    <span className="flex items-center gap-1.5">
                      <Folder className="h-3 w-3" /> {info.folder}
                    </span>
                  )}
                  {probe?.height ? <span>{probe.height}p</span> : null}
                  {probe?.duration ? <span>{formatDuration(probe.duration)}</span> : null}
                  {info?.size ? <span>{formatBytes(info.size)}</span> : null}
                  {probe?.videoCodec && <span>{probe.videoCodec.toUpperCase()}</span>}
                  {info && (
                    <span className="rounded bg-inset px-2 py-0.5 text-fg">
                      {info.delivery === "direct"
                        ? "Direct"
                        : info.delivery === "remux"
                          ? "Remuxed"
                          : "Transcoded"}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  onClick={toggleFavorite}
                  className={`btn btn-ghost ${favorite ? "text-danger" : ""}`}
                >
                  <Heart className={`h-3.5 w-3.5 ${favorite ? "fill-current" : ""}`} />
                  <span className="hidden sm:inline">{favorite ? "Saved" : "Save"}</span>
                </button>

                <button
                  onClick={async () => {
                    await fetch("/api/progress", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ movie: name, action: "reset" }),
                    });
                    window.location.reload();
                  }}
                  className="btn btn-ghost"
                  title="Forget my position in this file"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {info && !info.seekable && (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-inset px-4 py-3 text-xs leading-relaxed text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This file is being converted on the fly, so seeking restarts the stream from the
                point you pick. Converting the file to MP4/H.264 gives instant seeking.
              </p>
            )}
          </div>

          {/* ------------------------------------------------------ Up next */}
          <aside className="w-full shrink-0 xl:w-[340px]">
            {info?.next && (
              <>
                <h2 className="eyebrow mb-3">Next in this folder</h2>
                <Link
                  href={`/stream/${encodeURIComponent(info.next.name)}`}
                  className="group mb-8 flex gap-3 rounded-xl border border-line bg-elevated p-3 transition-colors hover:border-line-strong"
                >
                  <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-lg">
                    <DynamicThumbnail
                      movieName={info.next.name}
                      thumbnailUrl={info.next.thumbnail}
                      preview={false}
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </span>
                  </div>
                  <div className="min-w-0 self-center">
                    <p className="line-clamp-2 text-sm font-semibold text-fg">
                      {prettyTitle(info.next.name)}
                    </p>
                  </div>
                </Link>
              </>
            )}

            <h2 className="eyebrow mb-3">Up next</h2>
            <div className="flex flex-col gap-2">
              {upNext.map((item) => (
                <Link
                  key={item.name}
                  href={`/stream/${encodeURIComponent(item.name)}`}
                  className="group flex gap-3 rounded-xl border border-line bg-elevated p-2.5 transition-colors hover:border-line-strong"
                >
                  <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg">
                    <DynamicThumbnail
                      movieName={item.name}
                      thumbnailUrl={item.thumbnail}
                      preview={false}
                    />
                    {item.duration > 0 && item.progress > 0 && (
                      <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black/50">
                        <span
                          className="block h-full bg-accent"
                          style={{ width: `${(item.progress / item.duration) * 100}%` }}
                        />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 self-center">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-fg">
                      {prettyTitle(item.name)}
                    </p>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-subtle">
                      {item.format.replace(".", "")} · {formatBytes(item.size)}
                    </span>
                  </div>
                </Link>
              ))}

              {!library &&
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-[76px] rounded-xl skeleton" />
                ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

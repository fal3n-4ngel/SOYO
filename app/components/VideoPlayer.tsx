"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Captions,
  CaptionsOff,
  Check,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  RotateCcw,
  Settings,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatDuration } from "@/app/lib/types";

interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  source: "file" | "embedded";
}

export interface MediaInfo {
  name: string;
  folder: string;
  format: string;
  size: number;
  delivery: "direct" | "remux" | "transcode";
  seekable: boolean;
  probe: { duration: number; width: number; height: number; videoCodec: string } | null;
  subtitles: SubtitleTrack[];
  progress: { time: number; duration: number; completed: boolean } | null;
  next: { name: string; thumbnail: string } | null;
  settings: {
    autoplay: boolean;
    autoplayNext: boolean;
    defaultVolume: number;
    seekStep: number;
    rememberPosition: boolean;
  };
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({
  movie,
  info,
  onEnded,
}: {
  movie: string;
  info: MediaInfo | null;
  onEnded?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef(0);

  /**
   * Transcoded streams have no byte ranges, so seeking restarts ffmpeg at a new
   * offset. Everything the user sees is `offset + video.currentTime`.
   */
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [current, setCurrent] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [menu, setMenu] = useState<"none" | "speed" | "subtitles">("none");
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [resumeHint, setResumeHint] = useState<number | null>(null);
  const [ripple, setRipple] = useState<"left" | "right" | null>(null);

  const seekable = info?.seekable ?? true;
  const seekStep = info?.settings.seekStep ?? 10;
  // Transcoded output reports Infinity, so trust the probe for total runtime.
  const duration = info?.probe?.duration || info?.progress?.duration || 0;

  /* ------------------------------------------------------------ helpers */

  const src = useCallback(
    (startAt: number) => {
      const base = `/api/stream/${encodeURIComponent(movie)}`;
      return startAt > 0 && !seekable ? `${base}?t=${Math.floor(startAt)}` : base;
    },
    [movie, seekable]
  );

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
        setMenu("none");
      }
    }, 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => setPlaying(false));
    else video.pause();
    showControls();
  }, [showControls]);

  const seekTo = useCallback(
    (target: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clamped = Math.max(0, duration > 0 ? Math.min(target, duration - 1) : target);

      if (seekable) {
        video.currentTime = clamped;
        setCurrent(clamped);
        return;
      }

      // Restart the transcode at the new offset.
      const wasPlaying = !video.paused;
      offsetRef.current = clamped;
      setOffset(clamped);
      setCurrent(clamped);
      setBuffering(true);
      video.src = src(clamped);
      video.load();
      if (wasPlaying) video.play().catch(() => undefined);
    },
    [duration, seekable, src]
  );

  const skip = useCallback(
    (amount: number) => {
      seekTo(current + amount);
      setRipple(amount < 0 ? "left" : "right");
      setTimeout(() => setRipple(null), 450);
    },
    [current, seekTo]
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await shellRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* iOS Safari on iPhone only allows native video fullscreen */
    }
  }, []);

  const togglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await videoRef.current?.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  }, []);

  /* ------------------------------------------------------- apply settings */

  useEffect(() => {
    if (!info) return;
    setVolume(info.settings.defaultVolume);
    setSpeed(1);

    const resume = info.progress?.time ?? 0;
    if (info.settings.rememberPosition && resume > 30 && !info.progress?.completed) {
      offsetRef.current = seekable ? 0 : resume;
      setOffset(seekable ? 0 : resume);
      setCurrent(resume);
      setResumeHint(resume);
      setTimeout(() => setResumeHint(null), 6000);
    }

    const preferred = info.subtitles[0]?.id ?? null;
    setActiveTrack(preferred);
  }, [info, seekable]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
    video.playbackRate = speed;
  }, [volume, muted, speed]);

  /* ------------------------------------------------- progress persistence */

  const persist = useCallback(
    (time: number, useBeacon = false) => {
      if (!info?.settings.rememberPosition || time < 5) return;

      const payload = JSON.stringify({ movie, timeInSeconds: time, duration });

      if (useBeacon && navigator.sendBeacon) {
        // Fires reliably while the tab is closing.
        navigator.sendBeacon("/api/progress", new Blob([payload], { type: "application/json" }));
        return;
      }

      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    },
    [movie, duration, info]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused) persist(offsetRef.current + video.currentTime);
    }, 10_000);

    const onHide = () => {
      const video = videoRef.current;
      if (video) persist(offsetRef.current + video.currentTime, true);
    };

    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      onHide();
    };
  }, [persist]);

  /* ------------------------------------------------------------ keyboard */

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const handlers: Record<string, () => void> = {
        " ": togglePlay,
        k: togglePlay,
        ArrowLeft: () => skip(-seekStep),
        ArrowRight: () => skip(seekStep),
        j: () => skip(-30),
        l: () => skip(30),
        ArrowUp: () => setVolume((v) => Math.min(1, v + 0.05)),
        ArrowDown: () => setVolume((v) => Math.max(0, v - 0.05)),
        m: () => setMuted((v) => !v),
        f: toggleFullscreen,
        p: togglePiP,
        c: () => setActiveTrack((t) => (t ? null : info?.subtitles[0]?.id ?? null)),
        Home: () => seekTo(0),
        End: () => duration && seekTo(duration - 5),
      };

      const handler = handlers[event.key];
      if (handler) {
        event.preventDefault();
        handler();
        showControls();
        return;
      }

      // 0–9 jump to that tenth of the file.
      if (/^[0-9]$/.test(event.key) && duration > 0) {
        event.preventDefault();
        seekTo((duration * Number(event.key)) / 10);
        showControls();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, skip, seekStep, toggleFullscreen, togglePiP, seekTo, duration, showControls, info]);

  /* ------------------------------------------------------------ lifecycle */

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const onLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    setBuffering(false);

    // Direct streams support real seeking, so jump straight to the resume point.
    if (seekable && info?.settings.rememberPosition) {
      const resume = info.progress?.time ?? 0;
      if (resume > 30 && !info.progress?.completed && video.currentTime < 1) {
        video.currentTime = resume;
      }
    }

    if (info?.settings.autoplay) video.play().catch(() => setPlaying(false));
  };

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrent(offsetRef.current + video.currentTime);

    if (video.buffered.length > 0) {
      setBuffered(offsetRef.current + video.buffered.end(video.buffered.length - 1));
    }
  };

  const percent = duration > 0 ? (current / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  const handleScrub = (event: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  };

  const handleTap = (event: React.MouseEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      const rect = shellRef.current?.getBoundingClientRect();
      if (rect) skip(event.clientX - rect.left < rect.width / 2 ? -seekStep : seekStep);
    } else {
      togglePlay();
    }
    lastTap.current = now;
  };

  /* --------------------------------------------------------------- render */

  return (
    <div
      ref={shellRef}
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      className={`group relative w-full overflow-hidden bg-black ${
        fullscreen ? "h-screen" : "aspect-video rounded-2xl"
      } ${!controlsVisible && playing ? "cursor-none" : ""}`}
    >
      <video
        ref={videoRef}
        src={src(offset)}
        className="h-full w-full object-contain"
        playsInline
        crossOrigin="anonymous"
        onClick={handleTap}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => {
          setPlaying(true);
          showControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
          persist(offsetRef.current + (videoRef.current?.currentTime ?? 0));
        }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onEnded={() => {
          persist(duration, false);
          onEnded?.();
        }}
        onError={() =>
          setError(
            info?.delivery === "direct"
              ? "This file couldn't be played directly. Try setting Transcoding to Always in Settings."
              : "Playback failed. The file may be missing or ffmpeg isn't available."
          )
        }
      >
        {activeTrack && (
          <track
            key={activeTrack}
            kind="subtitles"
            src={`/api/subtitles/${encodeURIComponent(movie)}?track=${encodeURIComponent(activeTrack)}`}
            srcLang={info?.subtitles.find((t) => t.id === activeTrack)?.language ?? "en"}
            label={info?.subtitles.find((t) => t.id === activeTrack)?.label ?? "Subtitles"}
            default
          />
        )}
      </video>

      {/* Buffering */}
      {buffering && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/80" />
        </div>
      )}

      {/* Double-tap feedback */}
      {ripple && (
        <div
          className={`pointer-events-none absolute inset-y-0 flex w-1/2 items-center justify-center bg-white/10 ${
            ripple === "left" ? "left-0 rounded-r-full" : "right-0 rounded-l-full"
          }`}
        >
          <div className="flex flex-col items-center rounded-full bg-black/60 p-4 text-white">
            {ripple === "left" ? <SkipBack size={26} /> : <SkipForward size={26} />}
            <span className="mt-1 text-[10px] font-bold">{seekStep}s</span>
          </div>
        </div>
      )}

      {/* Resume toast */}
      {resumeHint !== null && (
        <div className="absolute left-4 top-4 flex items-center gap-3 rounded-xl bg-black/75 px-4 py-2.5 text-white backdrop-blur">
          <span className="text-xs font-medium">
            Resumed from {formatDuration(resumeHint)}
          </span>
          <button
            onClick={() => {
              seekTo(0);
              setResumeHint(null);
            }}
            className="text-[10px] font-bold uppercase tracking-widest text-white/70 transition-colors hover:text-white"
          >
            Start over
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 px-6 text-center">
          <p className="max-w-md text-sm text-white/90">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setError(null);
                videoRef.current?.load();
              }}
              className="rounded-lg bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-black"
            >
              Retry
            </button>
            <a
              href="/config"
              className="rounded-lg border border-white/30 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white"
            >
              Settings
            </a>
          </div>
        </div>
      )}

      {/* Centre play button when idle */}
      {!playing && !buffering && !error && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-2xl transition-transform hover:scale-105">
            <Play className="ml-1 h-7 w-7 fill-black text-black" />
          </span>
        </button>
      )}

      {/* ------------------------------------------------------- Controls */}
      <div
        onClick={(event) => event.stopPropagation()}
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-16 transition-opacity duration-300 sm:px-4 sm:pb-4 ${
          controlsVisible || !playing ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* Scrubber */}
        <div
          onClick={handleScrub}
          className="group/bar relative mb-3 h-6 cursor-pointer"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={current}
          tabIndex={0}
        >
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-all group-hover/bar:h-1.5">
            <div className="h-full bg-white/30" style={{ width: `${bufferedPercent}%` }} />
          </div>
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--accent)] transition-all group-hover/bar:h-1.5"
            style={{ width: `${percent}%` }}
          />
          <div
            className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
            style={{ left: `${percent}%` }}
          />
        </div>

        <div className="flex items-center gap-1 text-white sm:gap-2">
          <button onClick={togglePlay} className="rounded-full p-2 hover:bg-white/15" aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          <button onClick={() => skip(-seekStep)} className="hidden rounded-full p-2 hover:bg-white/15 sm:block" aria-label="Rewind">
            <SkipBack size={18} />
          </button>
          <button onClick={() => skip(seekStep)} className="hidden rounded-full p-2 hover:bg-white/15 sm:block" aria-label="Forward">
            <SkipForward size={18} />
          </button>
          <button onClick={() => seekTo(0)} className="hidden rounded-full p-2 hover:bg-white/15 lg:block" aria-label="Restart">
            <RotateCcw size={18} />
          </button>

          <div className="group/vol flex items-center">
            <button onClick={() => setMuted((v) => !v)} className="rounded-full p-2 hover:bg-white/15" aria-label="Mute">
              {muted || volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(event) => {
                setVolume(Number(event.target.value));
                setMuted(false);
              }}
              aria-label="Volume"
              className="ml-1 hidden h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100 sm:block"
              style={{ accentColor: "var(--accent)" }}
            />
          </div>

          <span className="ml-1 select-none font-mono text-xs tabular-nums text-white/90">
            {formatDuration(current)}
            <span className="mx-1 text-white/40">/</span>
            {formatDuration(duration)}
          </span>

          <div className="flex-1" />

          {info && info.subtitles.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMenu(menu === "subtitles" ? "none" : "subtitles")}
                className={`rounded-full p-2 hover:bg-white/15 ${menu === "subtitles" ? "bg-white/15" : ""}`}
                aria-label="Subtitles"
              >
                {activeTrack ? <Captions size={18} /> : <CaptionsOff size={18} />}
              </button>

              {menu === "subtitles" && (
                <Menu title="Subtitles">
                  <MenuItem active={activeTrack === null} onClick={() => { setActiveTrack(null); setMenu("none"); }}>
                    Off
                  </MenuItem>
                  {info.subtitles.map((track) => (
                    <MenuItem
                      key={track.id}
                      active={activeTrack === track.id}
                      onClick={() => {
                        setActiveTrack(track.id);
                        setMenu("none");
                      }}
                    >
                      {track.label}
                    </MenuItem>
                  ))}
                </Menu>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setMenu(menu === "speed" ? "none" : "speed")}
              className={`rounded-full p-2 hover:bg-white/15 ${menu === "speed" ? "bg-white/15" : ""}`}
              aria-label="Playback speed"
            >
              {speed === 1 ? <Settings size={18} /> : <Gauge size={18} />}
            </button>

            {menu === "speed" && (
              <Menu title="Speed">
                {SPEEDS.map((rate) => (
                  <MenuItem
                    key={rate}
                    active={speed === rate}
                    onClick={() => {
                      setSpeed(rate);
                      setMenu("none");
                    }}
                  >
                    {rate === 1 ? "Normal" : `${rate}×`}
                  </MenuItem>
                ))}
                {info && (
                  <div className="mt-1 border-t border-white/10 px-3 py-2 text-[10px] uppercase tracking-widest text-white/40">
                    {info.delivery === "direct"
                      ? "Direct stream"
                      : info.delivery === "remux"
                        ? "Remuxing"
                        : "Transcoding"}
                    {info.probe?.height ? ` · ${info.probe.height}p` : ""}
                  </div>
                )}
              </Menu>
            )}
          </div>

          <button onClick={togglePiP} className="hidden rounded-full p-2 hover:bg-white/15 lg:block" aria-label="Picture in picture">
            <PictureInPicture size={18} />
          </button>

          <button onClick={toggleFullscreen} className="rounded-full p-2 hover:bg-white/15" aria-label="Fullscreen">
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Menu({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="absolute bottom-full right-0 mb-3 min-w-44 overflow-hidden rounded-xl border border-white/10 bg-black/95 py-1 shadow-2xl backdrop-blur">
      <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
        {title}
      </div>
      <div className="max-h-64 overflow-y-auto">{children}</div>
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-white/10"
    >
      <span className="truncate">{children}</span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />}
    </button>
  );
}

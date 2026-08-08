"use client";

import { useEffect, useRef, useState } from "react";

interface DynamicThumbnailProps {
  movieName: string;
  thumbnailUrl: string;
  className?: string;
  imgClassName?: string;
  /** Hover-to-preview costs a real transcode; the config page can turn it off. */
  preview?: boolean;
  /** Preview starts here so it isn't just the studio logo. */
  previewAt?: number;
}

export default function DynamicThumbnail({
  movieName,
  thumbnailUrl,
  className = "",
  imgClassName = "",
  preview = true,
  previewAt = 60,
}: DynamicThumbnailProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  const enter = () => {
    if (!preview || videoFailed) return;
    // Delay so sweeping across a grid doesn't spawn a dozen ffmpeg processes.
    hoverTimer.current = setTimeout(() => setShowPreview(true), 550);
  };

  const leave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setShowPreview(false);
  };

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-inset ${className}`}
      onMouseEnter={enter}
      onMouseLeave={leave}
    >
      {!loaded && <div className="absolute inset-0 skeleton" />}

      <img
        src={thumbnailUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-all duration-500 ${
          showPreview && !videoFailed ? "opacity-0" : "opacity-100"
        } ${loaded ? "" : "opacity-0"} ${imgClassName}`}
      />

      {showPreview && !videoFailed && (
        <video
          src={`/api/stream/${encodeURIComponent(movieName)}?t=${previewAt}`}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

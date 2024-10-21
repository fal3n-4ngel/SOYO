"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

export default function EnhancedVideoPlayer({ movie }: { movie: string }) {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const decodedMovie = decodeURIComponent(movie);

  const togglePlay = useCallback(() => setPlaying((prev) => !prev), []);
  const toggleMute = useCallback(() => setMuted((prev) => !prev), []);
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
    setMuted(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  const handleProgress = useCallback((state: { played: number }) => {
    setProgress(state.played);
  }, []);

  const handleDuration = useCallback((duration: number) => {
    setDuration(duration);
  }, []);

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    playerRef.current?.seekTo(time);
  }, []);

  const handleSkip = useCallback((seconds: number) => {
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    playerRef.current?.seekTo(currentTime + seconds);
  }, []);

  const handleRestart = useCallback(() => {
    playerRef.current?.seekTo(0);
    setPlaying(true);
  }, []);

  const handleError = useCallback((e: Error) => {
    console.error("Error loading video:", e);
    setError("Error loading video. Please try again later.");
  }, []);

  const formatTime = useCallback((time: number) => {
    if (!isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    if(!document.fullscreenElement){
      setFullscreen(false);
    }
    return () => window.removeEventListener('resize', checkMobile);
   
  }, []);
 

  return (
    <div className="flex h-full flex-col w-[95vw] md:max-w-[60vw] mx-auto overflow-hidden" ref={containerRef}>
      <div className={`relative w-full bg-black rounded-xl overflow-hidden  ${fullscreen ? "min-h-full" : "min-h-fit"}`}>
        {error ? (
          <div className="w-full h-full flex items-center justify-center bg-black text-white">
            {error}
          </div>
        ) : (
          <ReactPlayer
            ref={playerRef}
            url={`/api/stream/${encodeURIComponent(movie)}`}
            width="100%"
            height="100%"
            playing={playing}
            volume={volume}
            muted={muted}
            onError={handleError}
            onProgress={handleProgress}
            onDuration={handleDuration}
            className=""
            fallback={<div className="w-full h-full  bg-black flex items-center justify-center text-white">Loading...</div>}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-black to-transparent">
          <input
            type="range"
            min={0}
            max={0.999999}
            step="any"
            value={progress}
            onChange={handleSeekChange}
            className="w-full mb-2"
          />
          <div className="flex flex-row items-center justify-between text-white">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <button onClick={togglePlay} className="p-1 sm:p-2 hover:bg-white/20 rounded-full transition">
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button onClick={() => handleSkip(-10)} className="p-1 sm:p-2 hover:bg-white/20 rounded-full transition">
                <SkipBack size={20} />
              </button>
              <button onClick={() => handleSkip(10)} className="p-1 sm:p-2 hover:bg-white/20 rounded-full transition">
                <SkipForward size={20} />
              </button>
              <button onClick={handleRestart} className="p-1 sm:p-2 hover:bg-white/20 rounded-full transition">
                <RotateCcw size={20} />
              </button>
              <span className="text-xs sm:text-sm">
                {formatTime(progress * duration)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="flex items-center">
                <button 
                  onClick={toggleMute} 
                  className="p-1 sm:p-2 hover:bg-white/20 rounded-full transition"
                >
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                {!isMobile && (
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-24 sm:w-32 h-2 ml-2"
                  />
                )}
              </div>
              <button onClick={toggleFullscreen} className="p-1 sm:p-2 hover:bg-white/20 rounded-full transition">
                {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
      <h2 className="text-lg sm:text-xl font-semibold mt-2 sm:mt-4 text-[#1d1d1d] flex">
        {decodedMovie
          .replaceAll("_", " ")
          .replaceAll("@", " ")
          .replaceAll(".", " ")
          .replaceAll("[MZM]", " ")
          .replace(/\.(mkv|mp4|avi|CV)/g, " ")}
      </h2>
    </div>
  );
}

import React, { useState, useRef, useCallback } from 'react';
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

  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const togglePlay = () => setPlaying(!playing);
  const toggleMute = () => setMuted(!muted);
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  const handleProgress = (state: { played: number }) => {
    setProgress(state.played);
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setProgress(time);
    playerRef.current?.seekTo(time);
  };

  const handleSkip = (seconds: number) => {
    const player = playerRef.current;
    if (player) {
      const currentTime = player.getCurrentTime();
      player.seekTo(currentTime + seconds);
    }
  };

  const handleRestart = () => {
    playerRef.current?.seekTo(0);
    setPlaying(true);
  };

  const handleError = (e: Error) => {
    console.error("Error loading video:", e);
    setError("Error loading video. Please try again later.");
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto" ref={containerRef}>
      <div className="relative w-full bg-black rounded-xl overflow-hidden" >
        {error ? (
          <div className=" w-full h-full flex items-center justify-center bg-black text-white">
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
            fallback={<div className="w-full h-full bg-black flex items-center justify-center text-white">Loading...</div>}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <input
            type="range"
            min={0}
            max={0.999999}
            step="any"
            value={progress}
            onChange={handleSeekChange}
            className="w-full mb-2"
          />
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded-full transition">
                {playing ? <Pause size={24} /> : <Play size={24} />}
              </button>
              <button onClick={() => handleSkip(-10)} className="p-2 hover:bg-white/20 rounded-full transition">
                <SkipBack size={24} />
              </button>
              <button onClick={() => handleSkip(10)} className="p-2 hover:bg-white/20 rounded-full transition">
                <SkipForward size={24} />
              </button>
              <button onClick={handleRestart} className="p-2 hover:bg-white/20 rounded-full transition">
                <RotateCcw size={24} />
              </button>
              <span className="text-sm">
                {formatTime(progress * duration)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-full transition">
                {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={handleVolumeChange}
                className="w-24"
              />
              <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-full transition">
                {fullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
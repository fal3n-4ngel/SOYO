"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Magnet, Play, Loader2, Users, HardDrive, FileVideo } from "lucide-react";
import type { TorrentDetails } from "@/app/lib/torrentEngine";
import { formatBytes } from "@/app/lib/types";

interface TorrentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TorrentModal({ open, onClose }: TorrentModalProps) {
  const router = useRouter();
  const [magnet, setMagnet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<TorrentDetails | null>(null);
  const [selectedFile, setSelectedFile] = useState<number>(0);

  if (!open) return null;

  const handleFetchInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnet.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/torrent/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magnet: magnet.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch torrent metadata");

      setDetails(json.details);
      // Auto-select largest video file
      if (json.details?.files?.length > 0) {
        const videoIndex = json.details.files.reduce(
          (maxIdx: number, f: any, idx: number) =>
            f.length > json.details.files[maxIdx].length ? idx : maxIdx,
          0
        );
        setSelectedFile(videoIndex);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error connecting to torrent peers");
    } finally {
      setLoading(false);
    }
  };

  const handleStartStream = () => {
    if (!details) return;
    const streamUrl = `/api/torrent/stream?hash=${encodeURIComponent(details.infoHash)}&file=${selectedFile}`;
    const file = details.files[selectedFile];
    const title = file ? file.name : details.name;

    // Navigate to streaming page with custom torrent stream
    router.push(`/stream/${encodeURIComponent(title)}?torrentUrl=${encodeURIComponent(streamUrl)}`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="surface w-full max-w-lg overflow-hidden border border-line bg-elevated shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg">
            <Magnet className="h-5 w-5 text-accent" />
            Stream Torrent / Magnet
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-inset hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!details ? (
            <form onSubmit={handleFetchInfo} className="space-y-4">
              <div>
                <label className="label">Magnet Link or Torrent Hash</label>
                <textarea
                  value={magnet}
                  onChange={(e) => setMagnet(e.target.value)}
                  placeholder="magnet:?xt=urn:btih:..."
                  rows={3}
                  className="field font-mono text-xs"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="btn btn-ghost">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !magnet.trim()}
                  className="btn btn-accent"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Fetching Peers...
                    </>
                  ) : (
                    "Load Torrent"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-line bg-inset p-4">
                <h3 className="font-semibold text-sm text-fg truncate">{details.name}</h3>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-success" />
                    {details.numPeers} Peers
                  </span>
                  <span className="flex items-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-subtle" />
                    {formatBytes(details.files.reduce((sum, f) => sum + f.length, 0))}
                  </span>
                </div>
              </div>

              {details.files.length > 1 && (
                <div>
                  <label className="label">Select Video File</label>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-line p-2 bg-inset">
                    {details.files.map((file, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedFile(idx)}
                        className={`flex w-full items-center justify-between p-2 rounded-md text-left text-xs transition-colors ${
                          selectedFile === idx
                            ? "bg-accent text-accent-fg font-semibold"
                            : "hover:bg-elevated text-fg"
                        }`}
                      >
                        <span className="truncate flex items-center gap-2">
                          <FileVideo className="h-3.5 w-3.5 shrink-0" />
                          {file.name}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] ml-2">
                          {formatBytes(file.length)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setDetails(null)}
                  className="btn btn-ghost text-xs"
                >
                  Change Magnet
                </button>

                <button onClick={handleStartStream} className="btn btn-accent">
                  <Play className="h-4 w-4 fill-current" />
                  Start Torrent Stream
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

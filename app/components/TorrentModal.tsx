"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X,
  Magnet,
  Play,
  Loader2,
  Users,
  HardDrive,
  FileVideo,
  Search,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { TorrentDetails } from "@/app/lib/torrentEngine";
import type { TorrentSearchResult } from "@/app/api/torrent/search/route";
import { formatBytes } from "@/app/lib/types";

interface TorrentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TorrentModal({ open, onClose }: TorrentModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"search" | "magnet">("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TorrentSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Magnet / Load state
  const [magnet, setMagnet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<TorrentDetails | null>(null);
  const [selectedFile, setSelectedFile] = useState<number>(0);

  if (!open) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/torrent/search?q=${encodeURIComponent(searchQuery.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");
      setSearchResults(json.results ?? []);
      if (json.results?.length === 0) {
        setSearchError("No torrent results found. Try another movie title.");
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Failed to search torrents");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSearchResult = async (item: TorrentSearchResult) => {
    setLoading(true);
    setError(null);
    setActiveTab("magnet");
    setMagnet(item.magnet);

    try {
      const res = await fetch("/api/torrent/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ magnet: item.magnet }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load torrent metadata");

      setDetails(json.details);
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

    router.push(`/stream/${encodeURIComponent(title)}?torrentUrl=${encodeURIComponent(streamUrl)}`);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="surface w-full max-w-xl overflow-hidden border border-line bg-elevated shadow-2xl rounded-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <Magnet className="h-5 w-5 text-accent" />
            <h2 className="text-base font-semibold text-fg">Stream Online Torrents</h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-line p-0.5 bg-inset">
              <button
                onClick={() => setActiveTab("search")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "search" ? "bg-elevated text-fg shadow-sm" : "text-subtle hover:text-fg"
                }`}
              >
                Search Torrents
              </button>
              <button
                onClick={() => setActiveTab("magnet")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "magnet" ? "bg-elevated text-fg shadow-sm" : "text-subtle hover:text-fg"
                }`}
              >
                Paste Magnet
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-inset hover:text-fg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === "search" ? (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movie titles (e.g. Inception, Sintel, Interstellar)..."
                    className="field pl-10"
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={searching || !searchQuery.trim()} className="btn btn-accent px-4">
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </button>
              </form>

              {searchError && (
                <div className="rounded-xl border border-line bg-inset p-4 text-center text-xs text-muted">
                  {searchError}
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2.5">
                  <span className="eyebrow">{searchResults.length} Verified Torrent Results</span>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                    {searchResults.map((res) => (
                      <div
                        key={res.id}
                        className="group flex items-center gap-3.5 rounded-xl border border-line bg-inset p-3 transition-colors hover:border-line-strong hover:bg-elevated"
                      >
                        {res.poster ? (
                          <img
                            src={res.poster}
                            alt={res.title}
                            className="h-16 w-11 rounded-md object-cover border border-line shrink-0"
                          />
                        ) : (
                          <div className="h-16 w-11 rounded-md bg-elevated border border-line flex items-center justify-center shrink-0 text-subtle">
                            <Sparkles className="h-4 w-4" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-xs text-fg truncate">
                            {res.title} {res.year && <span className="text-muted font-normal">({res.year})</span>}
                          </h4>

                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
                            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent-fg border border-accent/30 font-extrabold">
                              {res.quality}
                            </span>
                            <span>{res.size}</span>
                            <span className="flex items-center gap-1 text-success">
                              <Users className="h-3 w-3" />
                              {res.seeds} seeds
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectSearchResult(res)}
                          className="btn btn-primary text-xs py-2 px-3 shrink-0"
                        >
                          Stream
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
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
                          <Loader2 className="h-4 w-4 animate-spin" /> Connecting to Peers...
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
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

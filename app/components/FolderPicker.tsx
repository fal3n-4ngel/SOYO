"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, CornerLeftUp, Film, HardDrive, Folder, X } from "lucide-react";

interface Entry {
  name: string;
  path: string;
  hasChildren: boolean;
}

interface Listing {
  path: string | null;
  parent: string | null;
  entries: Entry[];
  drives: string[];
  shortcuts?: string[];
  mediaCount?: number;
}

interface FolderPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
}

/** Browses the server's folders so nobody has to type `G:\Media\Movies` by hand. */
export default function FolderPicker({ open, onClose, onSelect }: FolderPickerProps) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useCallback(async (path: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const url = path ? `/api/fs?path=${encodeURIComponent(path)}` : "/api/fs";
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cannot open that folder");
      setListing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot open that folder");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) navigate(null);
  }, [open, navigate]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            onClick={(event) => event.stopPropagation()}
            className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-elevated sm:h-[70vh] sm:rounded-2xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-fg">Choose a media folder</h2>
                <p className="truncate font-mono text-xs text-subtle">
                  {listing?.path ?? "This computer"}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-lg p-2 text-subtle hover:bg-inset hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {listing && (
              <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-line px-5 py-2.5">
                <button onClick={() => navigate(null)} className="chip">
                  <HardDrive className="h-3 w-3" /> Drives
                </button>
                {listing.shortcuts?.map((path) => (
                  <button key={path} onClick={() => navigate(path)} className="chip">
                    {path.split(/[\\/]/).pop()}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2">
              {loading && (
                <div className="space-y-1.5 p-2">
                  {Array.from({ length: 7 }).map((_, index) => (
                    <div key={index} className="h-11 rounded-lg skeleton" />
                  ))}
                </div>
              )}

              {error && !loading && (
                <div className="p-6 text-center">
                  <p className="text-sm text-danger">{error}</p>
                  <button onClick={() => navigate(null)} className="btn btn-ghost mt-4">
                    Back to drives
                  </button>
                </div>
              )}

              {!loading && !error && listing && (
                <>
                  {listing.parent && (
                    <button
                      onClick={() => navigate(listing.parent)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-inset"
                    >
                      <CornerLeftUp className="h-4 w-4 shrink-0" />
                      Up one level
                    </button>
                  )}

                  {listing.entries.map((entry) => (
                    <button
                      key={entry.path}
                      onClick={() => navigate(entry.path)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-inset"
                    >
                      {listing.path === null ? (
                        <HardDrive className="h-4 w-4 shrink-0 text-muted" />
                      ) : (
                        <Folder className="h-4 w-4 shrink-0 text-muted" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-fg">{entry.name}</span>
                      {entry.hasChildren && (
                        <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />
                      )}
                    </button>
                  ))}

                  {listing.entries.length === 0 && (
                    <p className="p-6 text-center text-sm text-subtle">No subfolders here.</p>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                {listing?.path && (
                  <>
                    <Film className="h-3.5 w-3.5" />
                    {listing.mediaCount ?? 0} video{listing.mediaCount === 1 ? "" : "s"} here
                  </>
                )}
              </span>
              <button
                onClick={() => {
                  if (listing?.path) {
                    onSelect(listing.path);
                    onClose();
                  }
                }}
                disabled={!listing?.path}
                className="btn btn-primary"
              >
                Use this folder
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

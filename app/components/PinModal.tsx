"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, X } from "lucide-react";

interface PinModalProps {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}

export default function PinModal({ open, onClose, onUnlocked }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      // Autofocus after the entry animation so mobile keyboards behave.
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = async () => {
    if (!pin || busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", pin }),
      });
      const data = await response.json();

      if (response.ok) {
        onUnlocked();
        onClose();
      } else {
        setError(data.error || "Incorrect PIN");
        setPin("");
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
            className="surface relative w-full max-w-sm p-7"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-subtle transition-colors hover:bg-inset hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-inset">
              <Lock className="h-5 w-5 text-fg" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-fg">Private folders</h2>
            <p className="mt-1 text-sm text-muted">Enter your PIN to reveal hidden titles.</p>

            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, "").slice(0, 8));
                setError("");
              }}
              onKeyDown={(event) => event.key === "Enter" && submit()}
              placeholder="••••"
              className="field mt-6 text-center text-2xl tracking-[0.7em]"
            />

            {error && <p className="mt-3 text-xs font-semibold text-danger">{error}</p>}

            <button onClick={submit} disabled={busy || !pin} className="btn btn-primary mt-5 w-full">
              {busy ? "Checking…" : "Unlock"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

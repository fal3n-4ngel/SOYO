"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Copy, Wifi, WifiOff } from "lucide-react";
import type { NetworkInfo } from "@/app/lib/types";
import { useTheme } from "@/app/lib/useTheme";

export default function ConnectPanel({ compact = false }: { compact?: boolean }) {
  const [info, setInfo] = useState<NetworkInfo | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { resolved } = useTheme();

  useEffect(() => {
    fetch("/api/network")
      .then((response) => response.json())
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement("textarea");
      field.value = value;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(value);
    setTimeout(() => setCopied(null), 1600);
  };

  if (!info) {
    return <div className="surface h-20 skeleton w-full max-w-xs mx-auto rounded-xl" />;
  }

  const healthy = info.diagnostics.boundToLan && info.primary;
  const universalUrl = info.urls.lan || info.urls.mdns || info.urls.local;

  return (
    <div className="surface overflow-hidden w-full max-w-xs mx-auto rounded-xl border border-line bg-elevated/90 backdrop-blur-md p-2.5 shadow-lg">
      <div className="flex items-center gap-3">
        {universalUrl && (
          <div className="shrink-0 rounded-lg border border-line bg-white p-1.5 dark:bg-black/40">
            <img
              src={`/api/qr?dark=${resolved === "dark" ? "1" : "0"}&url=${encodeURIComponent(universalUrl)}`}
              alt="QR Code"
              className="h-12 w-12 rounded"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted">
              {healthy ? (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
              ) : (
                <WifiOff className="h-3 w-3 text-danger" />
              )}
              {healthy ? "Online" : "Offline"}
            </span>

            {info.diagnostics.hints.length > 0 && (
              <details className="group relative">
                <summary className="flex cursor-pointer list-none items-center text-subtle hover:text-fg">
                  <AlertTriangle className="h-3 w-3" />
                </summary>
                <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg border border-line bg-elevated p-2 shadow-xl z-50">
                  {info.diagnostics.hints.map((hint, i) => (
                    <p key={i} className="text-[10px] leading-tight text-muted">{hint}</p>
                  ))}
                </div>
              </details>
            )}
          </div>

          <button
            onClick={() => copy(universalUrl)}
            className="group flex w-full items-center justify-between gap-1.5 rounded-md border border-line bg-inset px-2 py-1 text-left transition-colors hover:border-line-strong"
          >
            <span className="truncate font-mono text-[11px] text-fg">{universalUrl}</span>
            {copied === universalUrl ? (
              <Check className="h-3 w-3 shrink-0 text-success" />
            ) : (
              <Copy className="h-3 w-3 shrink-0 text-subtle transition-colors group-hover:text-fg" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

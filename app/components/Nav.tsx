"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LockOpen, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "@/app/lib/useTheme";

interface NavProps {
  isUnlocked?: boolean;
  hasPin?: boolean;
  onUnlock?: () => void;
  onLock?: () => void;
}

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Library" },
];

export default function Nav({ isUnlocked, hasPin, onUnlock, onLock }: NavProps) {
  const pathname = usePathname();
  const { resolved, toggle, mounted } = useTheme();

  return (
    <nav className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[var(--nav-height)] max-w-[1800px] items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="text-xl font-medium tracking-tight text-fg font-sans">
            SOYO
          </Link>

          <div className="flex items-center gap-5">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    active ? "text-fg" : "text-subtle hover:text-fg"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hasPin &&
            (isUnlocked ? (
              <button
                onClick={onLock}
                title="Lock private folders"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-danger transition-colors hover:bg-inset"
              >
                <LockOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            ) : (
              <button
                onClick={onUnlock}
                title="Unlock private folders"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:bg-inset hover:text-fg"
              >
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Unlock</span>
              </button>
            ))}

          <button
            onClick={toggle}
            title="Toggle theme"
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-inset hover:text-fg"
          >
            {/* Rendered only after mount so SSR and client agree on the icon. */}
            {mounted && resolved === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <Link
            href="/config"
            title="Settings"
            className={`rounded-lg p-2 transition-colors hover:bg-inset hover:text-fg ${
              pathname === "/config" ? "text-fg" : "text-muted"
            }`}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}

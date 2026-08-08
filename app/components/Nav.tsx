"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LockOpen, Magnet, Moon, Settings, Sun, User } from "lucide-react";
import { useTheme } from "@/app/lib/useTheme";
import ProfileModal from "./ProfileModal";
import TorrentModal from "./TorrentModal";
import type { UserProfile } from "@/app/lib/db";

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTorrentModal, setShowTorrentModal] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users ?? []);
        setActiveUser(json.activeUser ?? null);
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

        <div className="flex items-center gap-2">
          {/* Stream Torrent Button */}
          <button
            onClick={() => setShowTorrentModal(true)}
            title="Stream Online Torrent / Magnet"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-fg bg-accent/20 border border-accent/30 transition-colors hover:bg-accent hover:text-accent-fg"
          >
            <Magnet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Torrent</span>
          </button>

          {/* Active Profile PFP Switcher Button */}
          <button
            onClick={() => setShowProfileModal(true)}
            title={`Active profile: ${activeUser?.name ?? "Main Profile"}`}
            className="flex items-center gap-2 rounded-full border border-line bg-inset p-1 pr-3 transition-colors hover:border-line-strong hover:bg-elevated"
          >
            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-line bg-elevated text-sm shadow-inner">
              {activeUser?.avatar?.startsWith("/") ? (
                <img src={activeUser.avatar} alt={activeUser.name} className="h-full w-full object-cover" />
              ) : (
                <span>{activeUser?.avatar ?? "🍿"}</span>
              )}
            </div>
            <span className="hidden sm:inline font-mono text-[11px] font-semibold text-fg max-w-[100px] truncate">
              {activeUser?.name ?? "Profile"}
            </span>
          </button>

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

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileChanged={fetchUsers}
        activeUser={activeUser}
        users={users}
      />

      <TorrentModal
        open={showTorrentModal}
        onClose={() => setShowTorrentModal(false)}
      />
    </nav>
  );
}

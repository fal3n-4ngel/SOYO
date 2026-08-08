"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Upload, Check, Trash2, User } from "lucide-react";
import type { UserProfile } from "@/app/lib/db";

const PRESET_EMOJIS = ["🍿", "🎬", "📽️", "📺", "⭐", "🚀", "🎭", "🎧", "🎮", "🦊", "🦁", "🐼"];

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onProfileChanged: () => void;
  activeUser: UserProfile | null;
  users: UserProfile[];
}

export default function ProfileModal({
  open,
  onClose,
  onProfileChanged,
  activeUser,
  users: initialUsers,
}: ProfileModalProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [view, setView] = useState<"select" | "create">("select");
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🍿");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  if (!open || !mounted) return null;

  const handleSelectUser = async (userId: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", userId }),
      });
      if (res.ok) {
        onProfileChanged();
        onClose();
      }
    } catch {
      /* ignore */
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          avatar: selectedAvatar,
        }),
      });

      if (res.ok) {
        setName("");
        setView("select");
        onProfileChanged();
        onClose();
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setSelectedAvatar(json.url);
      }
    } catch {
      /* ignore */
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProfile = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this profile?")) return;

    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: "DELETE" });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users);
        onProfileChanged();
      }
    } catch {
      /* ignore */
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="surface w-full max-w-md overflow-hidden border border-line bg-elevated shadow-2xl rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold text-fg">
            {view === "select" ? "Who is watching?" : "Create Profile"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-inset hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {view === "select" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {users.map((user) => {
                  const isActive = activeUser?.id === user.id;
                  const isImage = user.avatar.startsWith("/");

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user.id)}
                      className={`group relative flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-all ${
                        isActive
                          ? "border-fg bg-inset shadow-sm"
                          : "border-line bg-elevated hover:border-line-strong hover:bg-inset"
                      }`}
                    >
                      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-line bg-inset text-2xl shadow-inner group-hover:scale-105 transition-transform">
                        {isImage ? (
                          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{user.avatar}</span>
                        )}
                        {isActive && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-accent">
                            <Check className="h-5 w-5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <span className="truncate text-xs font-medium text-fg max-w-full">
                        {user.name}
                      </span>

                      {users.length > 1 && !isActive && (
                        <button
                          onClick={(e) => handleDeleteProfile(user.id, e)}
                          title="Delete profile"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 rounded-md p-1 text-subtle hover:bg-danger/10 hover:text-danger transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </button>
                  );
                })}

                <button
                  onClick={() => setView("create")}
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line p-4 text-center text-muted transition-all hover:border-line-strong hover:bg-inset hover:text-fg"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-inset">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Add Profile</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateProfile} className="space-y-5">
              <div>
                <label className="label">Profile Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex, Kids, Living Room"
                  className="field"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="label">Choose Avatar (PFP)</label>

                {/* Selected PFP preview */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-inset text-2xl shadow-inner">
                    {selectedAvatar.startsWith("/") ? (
                      <img src={selectedAvatar} alt="Selected PFP" className="h-full w-full object-cover" />
                    ) : (
                      <span>{selectedAvatar}</span>
                    )}
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn btn-ghost text-xs py-2 px-3"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? "Uploading..." : "Upload Custom PFP"}
                    </button>
                  </div>
                </div>

                {/* Preset Emojis Grid */}
                <div className="grid grid-cols-6 gap-2 pt-2 border-t border-line">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-base transition-transform ${
                        selectedAvatar === emoji
                          ? "bg-fg text-bg scale-110 shadow-sm"
                          : "bg-inset hover:bg-elevated hover:scale-105"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setView("select")}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !name.trim()}
                  className="btn btn-primary"
                >
                  {submitting ? "Creating..." : "Save Profile"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

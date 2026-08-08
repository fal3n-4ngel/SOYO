"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Cpu,
  Download,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Shield,
  Sun,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import Nav from "@/app/components/Nav";
import ConnectPanel from "@/app/components/ConnectPanel";
import FolderPicker from "@/app/components/FolderPicker";
import { Switch } from "@/app/components/ui/switch";
import { Slider as SliderControl } from "@/app/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { setAccent, useTheme, type Theme } from "@/app/lib/useTheme";
import { formatBytes, formatRelative, type LibraryStats, type NetworkInfo } from "@/app/lib/types";

/* ------------------------------------------------------------------ *
 * Shared bits
 * ------------------------------------------------------------------ */

interface Settings {
  mediaDirs: string[];
  privateFolders: string[];
  hasPin: boolean;
  theme: Theme;
  accent: string;
  defaultSort: "name" | "added" | "size" | "recent";
  defaultView: "grid" | "list";
  autoplay: boolean;
  autoplayNext: boolean;
  defaultVolume: number;
  seekStep: number;
  rememberPosition: boolean;
  completedThreshold: number;
  transcode: "auto" | "always" | "never";
  transcodeQuality: "low" | "medium" | "high";
  thumbnailsEnabled: boolean;
  thumbnailTimemark: number;
  hoverPreview: boolean;
  externalArtwork: boolean;
  extensions: string[];
  scanOnStart: boolean;
}

const TABS = [
  { id: "library", label: "Library", icon: FolderPlus },
  { id: "network", label: "Network", icon: Wifi },
  { id: "playback", label: "Playback", icon: Monitor },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "advanced", label: "Advanced", icon: Cpu },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-6">
      <h2 className="text-base font-bold tracking-tight text-fg">{title}</h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="font-mono text-xs text-muted">{display}</span>
      </div>
      <SliderControl
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        className="mt-1"
      />
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="py-3">
      <span className="label">{label}</span>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              value === option.value
                ? "border-accent bg-accent-soft"
                : "border-line bg-inset hover:border-line-strong"
            }`}
          >
            <span className="block text-sm font-semibold text-fg">{option.label}</span>
            {option.hint && (
              <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                {option.hint}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

export default function ConfigPage() {
  const [tab, setTab] = useState<TabId>("library");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [dirStatus, setDirStatus] = useState<{ path: string; exists: boolean }[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);

  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const { setTheme } = useTheme();

  const notify = useCallback((kind: "ok" | "err", text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const [settingsRes, libraryRes, networkRes] = await Promise.all([
        fetch("/api/settings").then((r) => r.json()),
        fetch("/api/library").then((r) => r.json()),
        fetch("/api/network").then((r) => r.json()),
      ]);
      setSettings(settingsRes.settings);
      setDirStatus(settingsRes.mediaDirStatus ?? []);
      setStats(libraryRes.stats);
      setNetwork(networkRes);
    } catch {
      notify("err", "Could not load settings");
    }
  }, [notify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /** Optimistic save — the UI updates immediately and rolls back on failure. */
  const save = useCallback(
    async (patch: Record<string, unknown>, message = "Saved") => {
      const previous = settings;
      setSettings((current) => (current ? { ...current, ...patch } as Settings : current));

      try {
        const response = await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await response.json();

        if (!response.ok) {
          setSettings(previous);
          notify("err", data.error || "Could not save");
          return false;
        }

        setSettings(data.settings);
        if (data.rescan) {
          // Directory or filter changes kick off a background scan.
          setTimeout(() => {
            fetch("/api/library")
              .then((r) => r.json())
              .then((d) => setStats(d.stats))
              .catch(() => undefined);
          }, 1200);
        }
        notify("ok", message);
        return true;
      } catch {
        setSettings(previous);
        notify("err", "Could not reach the server");
        return false;
      }
    },
    [settings, notify]
  );

  const runAction = useCallback(
    async (action: string, message: string) => {
      setBusy(action);
      try {
        const response = await fetch("/api/library", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        if (action === "export") {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "soyo-backup.json";
          link.click();
          URL.revokeObjectURL(url);
        }

        if (data.stats) setStats(data.stats);
        else await loadAll();

        notify("ok", message);
      } catch {
        notify("err", "That didn't work");
      } finally {
        setBusy(null);
      }
    },
    [loadAll, notify]
  );

  if (!settings) {
    return (
      <div className="min-h-screen bg-bg">
        <Nav />
        <div className="mx-auto max-w-4xl space-y-4 px-5 py-12 sm:px-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Nav />

      <FolderPicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={(path) => {
          if (settings.mediaDirs.includes(path)) {
            notify("err", "That folder is already in your library");
            return;
          }
          save({ mediaDirs: [...settings.mediaDirs, path] }, "Folder added — scanning…");
        }}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 px-4">
          <div
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl ${
              toast.kind === "ok" ? "bg-fg text-bg" : "bg-danger text-white"
            }`}
          >
            {toast.kind === "ok" ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            {toast.text}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-fg">Settings</h1>
          <p className="mt-1.5 text-sm text-muted">
            Everything about how Soyo finds, serves and plays your media.
          </p>
        </header>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabId)} className="mb-8">
          <TabsList>
            {TABS.map((item) => {
              const Icon = item.icon;
              return (
                <TabsTrigger key={item.id} value={item.id}>
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="space-y-5">
          {tab === "library" && (
            <LibraryTab
              settings={settings}
              dirStatus={dirStatus}
              stats={stats}
              busy={busy}
              save={save}
              runAction={runAction}
              onAddFolder={() => setShowPicker(true)}
            />
          )}
          {tab === "network" && <NetworkTab network={network} />}
          {tab === "playback" && <PlaybackTab settings={settings} save={save} />}
          {tab === "security" && (
            <SecurityTab settings={settings} save={save} notify={notify} reload={loadAll} />
          )}
          {tab === "appearance" && (
            <AppearanceTab settings={settings} save={save} setTheme={setTheme} />
          )}
          {tab === "advanced" && (
            <AdvancedTab settings={settings} save={save} runAction={runAction} busy={busy} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tabs
 * ------------------------------------------------------------------ */

function LibraryTab({
  settings,
  dirStatus,
  stats,
  busy,
  save,
  runAction,
  onAddFolder,
}: {
  settings: Settings;
  dirStatus: { path: string; exists: boolean }[];
  stats: LibraryStats | null;
  busy: string | null;
  save: (patch: Record<string, unknown>, message?: string) => Promise<boolean>;
  runAction: (action: string, message: string) => Promise<void>;
  onAddFolder: () => void;
}) {
  const [manualPath, setManualPath] = useState("");

  const removeDir = (path: string) =>
    save({ mediaDirs: settings.mediaDirs.filter((d) => d !== path) }, "Folder removed");

  return (
    <>
      <Section
        title="Media folders"
        description="Soyo indexes these folders and everything nested inside them. Add as many as you like — a drive of movies, a NAS mount, a series folder."
      >
        <div className="space-y-2">
          {settings.mediaDirs.length === 0 && (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
              No folders yet. Add one to build your library.
            </p>
          )}

          {settings.mediaDirs.map((dir) => {
            const missing = dirStatus.find((d) => d.path === dir)?.exists === false;
            return (
              <div
                key={dir}
                className="flex items-center gap-3 rounded-lg border border-line bg-inset px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[13px] text-fg">{dir}</span>
                  {missing && (
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-danger">
                      <AlertTriangle className="h-3 w-3" /> Not found — drive disconnected?
                    </span>
                  )}
                </span>
                <button
                  onClick={() => removeDir(dir)}
                  aria-label={`Remove ${dir}`}
                  className="shrink-0 rounded-lg p-2 text-subtle transition-colors hover:bg-elevated hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button onClick={onAddFolder} className="btn btn-primary">
            <FolderPlus className="h-3.5 w-3.5" /> Browse folders
          </button>
          <div className="flex flex-1 gap-2">
            <input
              value={manualPath}
              onChange={(event) => setManualPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && manualPath.trim()) {
                  save({ mediaDirs: [...settings.mediaDirs, manualPath.trim()] }, "Folder added");
                  setManualPath("");
                }
              }}
              placeholder="…or paste a path, e.g. D:\Movies"
              className="field font-mono text-[13px]"
            />
            <button
              onClick={() => {
                if (!manualPath.trim()) return;
                save({ mediaDirs: [...settings.mediaDirs, manualPath.trim()] }, "Folder added");
                setManualPath("");
              }}
              disabled={!manualPath.trim()}
              className="btn btn-ghost"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </Section>

      <Section title="Index" description="Rescan after adding or removing files on disk.">
        {stats && (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Titles", value: stats.count },
              { label: "Folders", value: stats.folders },
              { label: "On disk", value: formatBytes(stats.totalSize) },
              { label: "Last scan", value: formatRelative(stats.scannedAt) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-line bg-inset p-3.5">
                <div className="text-lg font-bold tracking-tight text-fg">{item.value}</div>
                <div className="eyebrow mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => runAction("rescan", "Library rescanned")}
          disabled={busy === "rescan"}
          className="btn btn-ghost"
        >
          {busy === "rescan" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {busy === "rescan" ? "Scanning…" : "Rescan now"}
        </button>
      </Section>

      <Section
        title="File types"
        description="Only these extensions are picked up during a scan."
      >
        <div className="flex flex-wrap gap-2">
          {[".mp4", ".mkv", ".webm", ".avi", ".mov", ".m4v", ".ogg", ".wmv", ".flv", ".ts", ".mpg"].map(
            (extension) => {
              const on = settings.extensions.includes(extension);
              return (
                <button
                  key={extension}
                  onClick={() =>
                    save(
                      {
                        extensions: on
                          ? settings.extensions.filter((e) => e !== extension)
                          : [...settings.extensions, extension],
                      },
                      "File types updated"
                    )
                  }
                  data-active={on}
                  className="chip"
                >
                  {extension.replace(".", "")}
                </button>
              );
            }
          )}
        </div>
      </Section>

      <Section
        title="Artwork"
        description="Thumbnails are generated from a frame of each video and cached in .soyo-thumbs, outside your media folders."
      >
        <div className="divide-y divide-line">
          <Toggle
            label="Generate thumbnails"
            hint="Grab a still from each video with ffmpeg."
            checked={settings.thumbnailsEnabled}
            onChange={(value) => save({ thumbnailsEnabled: value })}
          />
          <Toggle
            label="Hover previews"
            hint="Play a short clip when hovering a card. Costs CPU on the server."
            checked={settings.hoverPreview}
            onChange={(value) => save({ hoverPreview: value })}
          />
          <Toggle
            label="Fetch posters online"
            hint="Falls back to OMDb and AniList when a frame can't be extracted."
            checked={settings.externalArtwork}
            onChange={(value) => save({ externalArtwork: value })}
          />
          <Slider
            label="Frame position"
            value={settings.thumbnailTimemark}
            min={1}
            max={95}
            step={1}
            display={`${settings.thumbnailTimemark}% in`}
            onChange={(value) => save({ thumbnailTimemark: value }, "Thumbnail position saved")}
          />
        </div>

        <button
          onClick={() => runAction("clear-thumbnails", "Thumbnail cache cleared")}
          disabled={busy === "clear-thumbnails"}
          className="btn btn-ghost mt-4"
        >
          <ImageIcon className="h-3.5 w-3.5" /> Clear thumbnail cache
        </button>
      </Section>
    </>
  );
}

function NetworkTab({ network }: { network: NetworkInfo | null }) {
  const firewallCommand = "npm run allow-firewall";
  const [copied, setCopied] = useState(false);

  const interfaces = useMemo(() => network?.candidates ?? [], [network]);

  return (
    <>
      <Section
        title="Connect a device"
        description="Open one of these on a phone, tablet or TV that's on the same Wi-Fi."
      >
        <ConnectPanel />
      </Section>

      <Section
        title="Network interfaces"
        description="Soyo picks the adapter that's actually on your LAN. Virtual adapters from WSL, Hyper-V or a VPN are reachable from this machine but not from your phone."
      >
        <div className="overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-inset">
              <tr className="eyebrow">
                <th className="px-4 py-2.5 font-bold">Address</th>
                <th className="px-4 py-2.5 font-bold">Adapter</th>
                <th className="px-4 py-2.5 font-bold">Use</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {interfaces.map((entry, index) => (
                <tr key={entry.address}>
                  <td className="px-4 py-2.5 font-mono text-[13px] text-fg">{entry.address}</td>
                  <td className="truncate px-4 py-2.5 text-muted">{entry.iface}</td>
                  <td className="px-4 py-2.5">
                    {index === 0 && !entry.virtual ? (
                      <span className="rounded bg-success px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        Primary
                      </span>
                    ) : entry.virtual ? (
                      <span className="text-[11px] font-semibold text-subtle">Virtual</span>
                    ) : (
                      <span className="text-[11px] text-subtle">Alternate</span>
                    )}
                  </td>
                </tr>
              ))}
              {interfaces.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted">
                    No network adapters found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {network && (
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Port", value: String(network.port) },
              { label: "mDNS name", value: network.mdnsHost },
              {
                label: "Bound to LAN",
                value: network.diagnostics.boundToLan ? "Yes" : "No",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-line bg-inset p-3.5">
                <dt className="eyebrow">{item.label}</dt>
                <dd className="mt-1 font-mono text-sm text-fg">{item.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Section>

      {network?.diagnostics.platform === "win32" && (
        <Section
          title="Windows Firewall"
          description="Windows blocks inbound connections to Node by default. This is the most common reason a phone times out even though the URL is right. Run this once in an elevated PowerShell."
        >
          <div className="flex items-center gap-2 rounded-lg border border-line bg-inset px-4 py-3">
            <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">
              {firewallCommand}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(firewallCommand);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
              }}
              className="btn btn-ghost shrink-0 px-3 py-2"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : "Copy"}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Also make sure your Wi-Fi is set to <strong>Private</strong>, not Public — a Public
            profile blocks all LAN traffic regardless of firewall rules.
          </p>
        </Section>
      )}
    </>
  );
}

function PlaybackTab({
  settings,
  save,
}: {
  settings: Settings;
  save: (patch: Record<string, unknown>, message?: string) => Promise<boolean>;
}) {
  return (
    <>
      <Section title="Player" description="Defaults applied every time a video opens.">
        <div className="divide-y divide-line">
          <Toggle
            label="Autoplay"
            hint="Start playing as soon as the page loads."
            checked={settings.autoplay}
            onChange={(value) => save({ autoplay: value })}
          />
          <Toggle
            label="Play next automatically"
            hint="When a video ends, roll into the next file in the same folder."
            checked={settings.autoplayNext}
            onChange={(value) => save({ autoplayNext: value })}
          />
          <Toggle
            label="Remember position"
            hint="Resume where you left off, on any device."
            checked={settings.rememberPosition}
            onChange={(value) => save({ rememberPosition: value })}
          />
          <Slider
            label="Default volume"
            value={settings.defaultVolume}
            min={0}
            max={1}
            step={0.05}
            display={`${Math.round(settings.defaultVolume * 100)}%`}
            onChange={(value) => save({ defaultVolume: value }, "Volume saved")}
          />
          <Slider
            label="Skip step"
            value={settings.seekStep}
            min={5}
            max={60}
            step={5}
            display={`${settings.seekStep}s`}
            onChange={(value) => save({ seekStep: value }, "Skip step saved")}
          />
          <Slider
            label="Counts as watched at"
            value={settings.completedThreshold}
            min={0.5}
            max={1}
            step={0.01}
            display={`${Math.round(settings.completedThreshold * 100)}%`}
            onChange={(value) => save({ completedThreshold: value }, "Threshold saved")}
          />
        </div>
      </Section>

      <Section
        title="Transcoding"
        description="Files already in a browser-friendly codec stream straight through with instant seeking. Anything else is rewrapped or re-encoded on the fly."
      >
        <Choice
          label="When to transcode"
          value={settings.transcode}
          onChange={(value) => save({ transcode: value }, "Transcoding updated")}
          options={[
            { value: "auto", label: "Auto", hint: "Only when the browser can't play it" },
            { value: "never", label: "Never", hint: "Fastest, but some files won't play" },
            { value: "always", label: "Always", hint: "Most compatible, heaviest on CPU" },
          ]}
        />
        <Choice
          label="Quality"
          value={settings.transcodeQuality}
          onChange={(value) => save({ transcodeQuality: value }, "Quality updated")}
          options={[
            { value: "low", label: "480p", hint: "Weak hardware or slow Wi-Fi" },
            { value: "medium", label: "720p", hint: "Balanced" },
            { value: "high", label: "1080p", hint: "Needs a capable CPU" },
          ]}
        />
      </Section>
    </>
  );
}

function SecurityTab({
  settings,
  save,
  notify,
  reload,
}: {
  settings: Settings;
  save: (patch: Record<string, unknown>, message?: string) => Promise<boolean>;
  notify: (kind: "ok" | "err", text: string) => void;
  reload: () => Promise<void>;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [folderInput, setFolderInput] = useState("");

  const submitPin = async (remove: boolean) => {
    if (!remove && !/^\d{4,8}$/.test(newPin)) {
      notify("err", "PIN must be 4–8 digits");
      return;
    }

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: remove ? "" : newPin, currentPin }),
    });
    const data = await response.json();

    if (!response.ok) {
      notify("err", data.error || "Could not update the PIN");
      return;
    }

    setCurrentPin("");
    setNewPin("");
    await reload();
    notify("ok", remove ? "PIN removed" : "PIN saved");
  };

  const addFolder = () => {
    const value = folderInput.trim();
    if (!value) return;
    save(
      { privateFolders: [...new Set([...settings.privateFolders, value])] },
      "Private folder added"
    );
    setFolderInput("");
  };

  return (
    <>
      <Section
        title="PIN"
        description={
          settings.hasPin
            ? "A PIN is set. Private folders stay hidden until it's entered, and unlocking lasts six hours."
            : "Set a PIN to hide the folders listed below from the library, thumbnails and streams."
        }
      >
        <div className="max-w-sm space-y-4">
          {settings.hasPin && (
            <div>
              <label className="label">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                className="field tracking-[0.4em]"
              />
            </div>
          )}

          <div>
            <label className="label">{settings.hasPin ? "New PIN" : "Choose a PIN"}</label>
            <input
              type="password"
              inputMode="numeric"
              value={newPin}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="4–8 digits"
              className="field tracking-[0.4em]"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={() => submitPin(false)} disabled={!newPin} className="btn btn-primary">
              {settings.hasPin ? "Change PIN" : "Set PIN"}
            </button>
            {settings.hasPin && (
              <button onClick={() => submitPin(true)} className="btn btn-danger">
                Remove
              </button>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Private folders"
        description="Any folder whose path contains one of these words is hidden until the PIN is entered. Matching is case-insensitive."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {settings.privateFolders.length === 0 && (
            <span className="text-sm text-muted">Nothing is hidden right now.</span>
          )}
          {settings.privateFolders.map((folder) => (
            <span
              key={folder}
              className="flex items-center gap-2 rounded-full border border-line bg-inset px-3 py-1.5 text-xs font-semibold text-fg"
            >
              {folder}
              <button
                onClick={() =>
                  save(
                    { privateFolders: settings.privateFolders.filter((f) => f !== folder) },
                    "Removed"
                  )
                }
                aria-label={`Stop hiding ${folder}`}
                className="text-subtle transition-colors hover:text-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex max-w-sm gap-2">
          <input
            value={folderInput}
            onChange={(event) => setFolderInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addFolder()}
            placeholder="e.g. Private"
            className="field"
          />
          <button onClick={addFolder} disabled={!folderInput.trim()} className="btn btn-ghost">
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {!settings.hasPin && settings.privateFolders.length > 0 && (
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            These folders are hidden, but without a PIN there is no way to reveal them.
          </p>
        )}
      </Section>
    </>
  );
}

function AppearanceTab({
  settings,
  save,
  setTheme,
}: {
  settings: Settings;
  save: (patch: Record<string, unknown>, message?: string) => Promise<boolean>;
  setTheme: (theme: Theme) => void;
}) {
  const accents = ["#d7f24c", "#7c3aed", "#2563eb", "#0891b2", "#059669", "#ea580c", "#dc2626", "#db2777"];

  return (
    <>
      <Section
        title="Theme"
        description="Applied instantly on this device and used as the default on new ones."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  save({ theme: option.value }, "Theme saved");
                }}
                className={`flex items-center gap-2.5 rounded-lg border p-4 transition-colors ${
                  settings.theme === option.value
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-inset hover:border-line-strong"
                }`}
              >
                <Icon className="h-4 w-4 text-fg" />
                <span className="text-sm font-semibold text-fg">{option.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Accent" description="Used for progress bars, focus rings and highlights.">
        <div className="flex flex-wrap gap-2.5">
          {accents.map((color) => (
            <button
              key={color}
              onClick={() => {
                setAccent(color);
                save({ accent: color }, "Accent saved");
              }}
              aria-label={`Use accent ${color}`}
              className={`h-9 w-9 rounded-full transition-transform hover:scale-110 ${
                settings.accent === color ? "ring-2 ring-fg ring-offset-2 ring-offset-[var(--bg-elevated)]" : ""
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </Section>

      <Section title="Library defaults" description="How the library opens on a fresh device.">
        <Choice
          label="Sort"
          value={settings.defaultSort}
          onChange={(value) => save({ defaultSort: value }, "Default sort saved")}
          options={[
            { value: "name", label: "A–Z" },
            { value: "added", label: "Newest" },
            { value: "recent", label: "Last played" },
          ]}
        />
        <Choice
          label="View"
          value={settings.defaultView}
          onChange={(value) => save({ defaultView: value }, "Default view saved")}
          options={[
            { value: "grid", label: "Grid" },
            { value: "list", label: "List" },
          ]}
        />
      </Section>
    </>
  );
}

function AdvancedTab({
  settings,
  save,
  runAction,
  busy,
}: {
  settings: Settings;
  save: (patch: Record<string, unknown>, message?: string) => Promise<boolean>;
  runAction: (action: string, message: string) => Promise<void>;
  busy: string | null;
}) {
  return (
    <>
      <Section title="Startup">
        <div className="divide-y divide-line">
          <Toggle
            label="Rescan on startup"
            hint="Rebuild the index each time the server boots. Slower start, always current."
            checked={settings.scanOnStart}
            onChange={(value) => save({ scanOnStart: value })}
          />
        </div>
      </Section>

      <Section
        title="Backup"
        description="Exports your watch history, favourites and settings as JSON. Your media is never touched."
      >
        <button
          onClick={() => runAction("export", "Backup downloaded")}
          disabled={busy === "export"}
          className="btn btn-ghost"
        >
          <Download className="h-3.5 w-3.5" /> Download backup
        </button>
      </Section>

      <Section
        title="Reset"
        description="These clear stored data. Nothing here deletes video files from disk."
      >
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (confirm("Clear all watch history and resume positions?")) {
                runAction("clear-progress", "Watch history cleared");
              }
            }}
            disabled={busy === "clear-progress"}
            className="btn btn-danger"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear watch history
          </button>
          <button
            onClick={() => {
              if (confirm("Remove every favourite?")) {
                runAction("clear-favorites", "Favourites cleared");
              }
            }}
            disabled={busy === "clear-favorites"}
            className="btn btn-danger"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear favourites
          </button>
          <button
            onClick={() => runAction("clear-thumbnails", "Thumbnail cache cleared")}
            disabled={busy === "clear-thumbnails"}
            className="btn btn-danger"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear thumbnails
          </button>
        </div>
      </Section>
    </>
  );
}

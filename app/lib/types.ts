export interface Movie {
  name: string;
  relPath: string;
  folder: string;
  format: string;
  size: number;
  mtime: number;
  private: boolean;
  thumbnail: string;
  favorite: boolean;
  progress: number;
  duration: number;
  watchedAt: number | null;
  completed: boolean;
}

export interface LibraryStats {
  count: number;
  privateCount: number;
  folders: number;
  totalSize: number;
  byFormat: Record<string, number>;
  scannedAt: number | null;
  durationMs: number;
  scanning: boolean;
}

export interface MoviesResponse {
  movies: Movie[];
  total: number;
  continueWatching: Movie[];
  folders: string[];
  formats: string[];
  isUnlocked: boolean;
  hasPin: boolean;
  stats: LibraryStats;
}

export interface NetworkInfo {
  primary: string | null;
  candidates: { address: string; iface: string; virtual: boolean; score: number }[];
  hostname: string;
  mdnsHost: string;
  port: number;
  urls: { lan: string | null; mdns: string; local: string };
  diagnostics: {
    boundToLan: boolean;
    requestHost: string | null;
    clientIp: string | null;
    isRemoteClient: boolean;
    platform: string;
    hints: string[];
  };
}

/** Strips the extension and separator noise from a filename for display. */
export function prettyTitle(name: string): string {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "—";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatRelative(timestamp: number | null): string {
  if (!timestamp) return "never";
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

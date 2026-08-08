import fs from "fs";
import path from "path";
import crypto from "crypto";

export const DB_VERSION = 2;

export type TranscodeMode = "auto" | "always" | "never";
export type TranscodeQuality = "low" | "medium" | "high";
export type Theme = "light" | "dark" | "system";
export type SortKey = "name" | "added" | "size" | "recent";

export interface ProgressEntry {
  /** Seconds into the file. */
  time: number;
  /** Total runtime in seconds, 0 when unknown. */
  duration: number;
  updatedAt: number;
  completed: boolean;
}

export interface Settings {
  /** Root folders scanned for media. The first is the default write target. */
  mediaDirs: string[];
  /** Folder-name fragments hidden until the PIN is entered. */
  privateFolders: string[];
  pin: { salt: string; hash: string } | null;

  theme: Theme;
  accent: string;
  defaultSort: SortKey;
  defaultView: "grid" | "list";

  autoplay: boolean;
  autoplayNext: boolean;
  defaultVolume: number;
  seekStep: number;
  rememberPosition: boolean;
  /** Watched past this fraction counts as finished and leaves Continue Watching. */
  completedThreshold: number;

  transcode: TranscodeMode;
  transcodeQuality: TranscodeQuality;

  thumbnailsEnabled: boolean;
  /** Percentage into the file used for the auto-generated frame. */
  thumbnailTimemark: number;
  hoverPreview: boolean;
  externalArtwork: boolean;

  extensions: string[];
  scanOnStart: boolean;
}

export interface MovieMeta {
  name: string;
  /** Path relative to its media root, using forward slashes. */
  relPath: string;
  /** Absolute path on disk. */
  fullPath: string;
  folder: string;
  format: string;
  size: number;
  mtime: number;
  private: boolean;
  thumbnail: string;
}

export interface SoyoDB {
  version: number;
  settings: Settings;
  progress: Record<string, ProgressEntry>;
  favorites: string[];
  library: {
    movies: MovieMeta[];
    scannedAt: number | null;
    durationMs: number;
  };
}

const DB_PATH = path.resolve("./db.json");
const LEGACY_CONFIG_PATH = path.resolve("./config.json");

export const DEFAULT_SETTINGS: Settings = {
  mediaDirs: [],
  privateFolders: [],
  pin: null,

  theme: "light",
  accent: "#d7f24c",
  defaultSort: "name",
  defaultView: "grid",

  autoplay: true,
  autoplayNext: false,
  defaultVolume: 0.8,
  seekStep: 10,
  rememberPosition: true,
  completedThreshold: 0.95,

  transcode: "auto",
  transcodeQuality: "medium",

  thumbnailsEnabled: true,
  thumbnailTimemark: 20,
  hoverPreview: true,
  externalArtwork: true,

  extensions: [".mp4", ".mkv", ".webm", ".avi", ".mov", ".m4v", ".ogg", ".wmv", ".flv"],
  scanOnStart: false,
};

function emptyDB(): SoyoDB {
  return {
    version: DB_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    progress: {},
    favorites: [],
    library: { movies: [], scannedAt: null, durationMs: 0 },
  };
}

/* ------------------------------------------------------------------ *
 * Migration
 * ------------------------------------------------------------------ */

/**
 * Brings a v1 db.json (flat `progress: Record<string, number>`, `pin` as
 * plaintext, settings living in config.json) up to the current shape without
 * losing watch history.
 */
function migrate(raw: Record<string, unknown>): SoyoDB {
  const db = emptyDB();

  if (typeof raw.version === "number" && raw.version >= DB_VERSION) {
    // Already current — merge so new setting keys pick up their defaults.
    return {
      ...db,
      ...(raw as unknown as SoyoDB),
      settings: { ...DEFAULT_SETTINGS, ...((raw.settings as Partial<Settings>) ?? {}) },
      library: { ...db.library, ...((raw.library as SoyoDB["library"]) ?? {}) },
    };
  }

  const now = Date.now();
  const legacyProgress = (raw.progress ?? {}) as Record<string, number | ProgressEntry>;
  for (const [name, value] of Object.entries(legacyProgress)) {
    db.progress[name] =
      typeof value === "number"
        ? { time: value, duration: 0, updatedAt: now, completed: false }
        : value;
  }

  if (Array.isArray(raw.privateFolders)) {
    db.settings.privateFolders = raw.privateFolders as string[];
  }
  if (typeof raw.pin === "string" && raw.pin.length > 0) {
    db.settings.pin = hashPin(raw.pin);
  }

  // config.json used to hold the media directory.
  try {
    if (fs.existsSync(LEGACY_CONFIG_PATH)) {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_CONFIG_PATH, "utf8"));
      if (typeof legacy.movieDir === "string" && legacy.movieDir.trim()) {
        db.settings.mediaDirs = [legacy.movieDir];
      }
      if (typeof legacy.thumbnailCache === "boolean") {
        db.settings.thumbnailsEnabled = legacy.thumbnailCache || db.settings.thumbnailsEnabled;
      }
    }
  } catch {
    /* legacy config is best-effort */
  }

  return db;
}

/* ------------------------------------------------------------------ *
 * Read / write
 * ------------------------------------------------------------------ */

let cache: SoyoDB | null = null;

export function readDB(): SoyoDB {
  if (cache) return cache;

  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
      const migrated = migrate(raw);
      cache = migrated;
      if ((raw.version ?? 1) < DB_VERSION) writeDB(migrated);
      return migrated;
    }
  } catch (error) {
    console.error("[soyo] db.json is unreadable, starting fresh:", error);
  }

  cache = emptyDB();
  return cache;
}

/**
 * Writes via a temp file + rename so a crash mid-save cannot truncate db.json.
 * Progress pings land every few seconds, so this matters in practice.
 */
export function writeDB(db: SoyoDB): void {
  cache = db;
  const tmp = `${DB_PATH}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_PATH);
  } catch (error) {
    console.error("[soyo] Failed to write db.json:", error);
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

export function updateDB(mutate: (db: SoyoDB) => void): SoyoDB {
  const db = readDB();
  mutate(db);
  writeDB(db);
  return db;
}

export function getSettings(): Settings {
  return readDB().settings;
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const db = updateDB((d) => {
    d.settings = { ...d.settings, ...patch };
  });
  return db.settings;
}

/* ------------------------------------------------------------------ *
 * PIN
 * ------------------------------------------------------------------ */

export function hashPin(pin: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPin(pin: string): boolean {
  const stored = getSettings().pin;
  if (!stored) return false;
  const candidate = crypto.scryptSync(pin, stored.salt, 64);
  const expected = Buffer.from(stored.hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

export function getProgress(movieName: string): ProgressEntry | null {
  return readDB().progress[movieName] ?? null;
}

export function updateProgress(
  movieName: string,
  time: number,
  duration = 0
): ProgressEntry {
  const { completedThreshold } = getSettings();
  const entry: ProgressEntry = {
    time,
    duration,
    updatedAt: Date.now(),
    completed: duration > 0 && time / duration >= completedThreshold,
  };

  updateDB((db) => {
    const previous = db.progress[movieName];
    // Never lose a known duration because one ping arrived before metadata.
    if (previous && !duration) entry.duration = previous.duration;
    db.progress[movieName] = entry;
  });

  return entry;
}

export function clearProgress(movieName?: string): void {
  updateDB((db) => {
    if (movieName) delete db.progress[movieName];
    else db.progress = {};
  });
}

export function toggleFavorite(movieName: string): boolean {
  let isFavorite = false;
  updateDB((db) => {
    const index = db.favorites.indexOf(movieName);
    if (index === -1) {
      db.favorites.push(movieName);
      isFavorite = true;
    } else {
      db.favorites.splice(index, 1);
    }
  });
  return isFavorite;
}

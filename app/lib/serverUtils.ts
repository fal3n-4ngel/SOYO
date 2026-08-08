import fs from "fs";
import path from "path";
import { readDB, updateDB, getSettings, type MovieMeta, type Settings } from "./db";

/** Folders that never contain user media and are expensive to walk. */
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "$recycle.bin",
  "system volume information",
  ".soyo-thumbs",
  "thumbnails",
  "windows",
  "program files",
  "program files (x86)",
  "appdata",
]);

const MAX_DEPTH = 8;

export function getMediaDirs(): string[] {
  const dirs = getSettings().mediaDirs.filter((d) => d && d.trim());
  return dirs.length > 0 ? dirs : [];
}

export function isPrivatePath(relPath: string, privateFolders: string[]): boolean {
  if (privateFolders.length === 0) return false;
  const haystack = relPath.toLowerCase();
  return privateFolders.some((f) => f.trim() && haystack.includes(f.trim().toLowerCase()));
}

/* ------------------------------------------------------------------ *
 * Scanning
 * ------------------------------------------------------------------ */

async function walk(
  root: string,
  dir: string,
  settings: Settings,
  depth: number,
  out: MovieMeta[]
): Promise<void> {
  if (depth > MAX_DEPTH) return;

  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return; // permission denied, disconnected drive, etc.
  }

  const tasks: Promise<void>[] = [];

  for (const entry of entries) {
    const name = entry.name;
    if (name.startsWith("$") || name.startsWith(".")) continue;

    const fullPath = path.join(dir, name);

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(name.toLowerCase())) continue;
      tasks.push(walk(root, fullPath, settings, depth + 1, out));
      continue;
    }

    const extension = path.extname(name).toLowerCase();
    if (!settings.extensions.includes(extension)) continue;

    tasks.push(
      (async () => {
        try {
          const stat = await fs.promises.stat(fullPath);
          const relPath = path.relative(root, fullPath).split(path.sep).join("/");
          const folder = path.dirname(relPath) === "." ? "" : path.dirname(relPath);

          out.push({
            name,
            relPath,
            fullPath,
            folder,
            format: extension,
            size: stat.size,
            mtime: stat.mtimeMs,
            private: isPrivatePath(relPath, settings.privateFolders),
            thumbnail: `/api/thumbnail/${encodeURIComponent(name)}`,
          });
        } catch {
          /* skip unreadable file */
        }
      })()
    );
  }

  await Promise.all(tasks);
}

let scanInFlight: Promise<MovieMeta[]> | null = null;

/** Walks every media root and persists the result to db.json. */
export function scanLibrary(): Promise<MovieMeta[]> {
  if (scanInFlight) return scanInFlight;

  scanInFlight = (async () => {
    const started = Date.now();
    const settings = getSettings();
    const movies: MovieMeta[] = [];

    for (const root of getMediaDirs()) {
      if (!fs.existsSync(root)) {
        console.warn(`[soyo] Media directory not found, skipping: ${root}`);
        continue;
      }
      await walk(root, root, settings, 0, movies);
    }

    movies.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    updateDB((db) => {
      db.library = { movies, scannedAt: Date.now(), durationMs: Date.now() - started };
    });

    fileCache.clear();
    return movies;
  })().finally(() => {
    scanInFlight = null;
  });

  return scanInFlight;
}

export function isScanning(): boolean {
  return scanInFlight !== null;
}

/**
 * Returns the cached library, scanning once if it has never been built.
 * Private entries are withheld unless the PIN has been entered.
 */
export async function getLibrary(includePrivate: boolean): Promise<MovieMeta[]> {
  const db = readDB();
  let movies = db.library.movies;

  if (db.library.scannedAt === null) {
    movies = await scanLibrary();
  }

  return includePrivate ? movies : movies.filter((m) => !m.private);
}

export function getLibraryStats() {
  const db = readDB();
  const movies = db.library.movies;
  const byFormat: Record<string, number> = {};
  let totalSize = 0;

  for (const movie of movies) {
    byFormat[movie.format] = (byFormat[movie.format] ?? 0) + 1;
    totalSize += movie.size;
  }

  return {
    count: movies.length,
    privateCount: movies.filter((m) => m.private).length,
    folders: new Set(movies.map((m) => m.folder).filter(Boolean)).size,
    totalSize,
    byFormat,
    scannedAt: db.library.scannedAt,
    durationMs: db.library.durationMs,
    scanning: isScanning(),
  };
}

/* ------------------------------------------------------------------ *
 * Lookup
 * ------------------------------------------------------------------ */

const fileCache = new Map<string, string>();

/**
 * Resolves a movie's absolute path from the bare filename used in URLs.
 * Hits the library index first; only walks the disk when the index is cold or
 * the file arrived after the last scan.
 */
export function findMovieFile(movieName: string): string | null {
  const cached = fileCache.get(movieName);
  if (cached) {
    if (fs.existsSync(cached)) return cached;
    fileCache.delete(movieName);
  }

  const indexed = readDB().library.movies.find((m) => m.name === movieName);
  if (indexed && fs.existsSync(indexed.fullPath)) {
    fileCache.set(movieName, indexed.fullPath);
    return indexed.fullPath;
  }

  for (const root of getMediaDirs()) {
    const found = searchDisk(movieName, root, 0);
    if (found) {
      fileCache.set(movieName, found);
      return found;
    }
  }

  return null;
}

function searchDisk(movieName: string, dir: string, depth: number): string | null {
  if (depth > MAX_DEPTH) return null;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const direct = entries.find((e) => e.isFile() && e.name === movieName);
  if (direct) return path.join(dir, movieName);

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name.toLowerCase())) continue;
    if (entry.name.startsWith("$") || entry.name.startsWith(".")) continue;

    const found = searchDisk(movieName, path.join(dir, entry.name), depth + 1);
    if (found) return found;
  }

  return null;
}

export function getMovieMeta(movieName: string): MovieMeta | null {
  return readDB().library.movies.find((m) => m.name === movieName) ?? null;
}

/** Guards against `..` traversal when a caller hands us a path. */
export function isInsideMediaDirs(candidate: string): boolean {
  const resolved = path.resolve(candidate);
  return getMediaDirs().some((root) => {
    const rel = path.relative(path.resolve(root), resolved);
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
  });
}

/** Where generated thumbnails live — outside the media folders, next to db.json. */
export function getThumbnailDir(): string {
  const dir = path.resolve("./.soyo-thumbs");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

import path from "path";
import fs from "fs";

// Persistent WebTorrent client instance on globalThis to prevent multiple clients on dev reload
declare global {
  var _webtorrentClient: any;
}

const TORRENT_CACHE_DIR = path.resolve("./.soyo-torrents");

if (!fs.existsSync(TORRENT_CACHE_DIR)) {
  try {
    fs.mkdirSync(TORRENT_CACHE_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

async function getClient() {
  if (globalThis._webtorrentClient) {
    return globalThis._webtorrentClient;
  }

  // Dynamically import WebTorrent (ESM module)
  const WebTorrentModule = await import("webtorrent");
  const WebTorrent = WebTorrentModule.default || WebTorrentModule;

  const client = new WebTorrent({
    path: TORRENT_CACHE_DIR,
  });

  globalThis._webtorrentClient = client;
  return client;
}

export interface TorrentFileInfo {
  name: string;
  path: string;
  length: number;
  index: number;
}

export interface TorrentDetails {
  infoHash: string;
  name: string;
  magnetURI: string;
  numPeers: number;
  downloaded: number;
  downloadSpeed: number;
  progress: number;
  files: TorrentFileInfo[];
}

export async function addTorrent(magnetOrUrl: string): Promise<TorrentDetails> {
  const client = await getClient();

  return new Promise((resolve, reject) => {
    // Check if torrent already exists
    const existing = client.get(magnetOrUrl);
    if (existing && existing.ready) {
      return resolve(formatTorrentDetails(existing));
    }

    const timeout = setTimeout(() => {
      reject(new Error("Torrent metadata fetch timed out. Check magnet link or peer connectivity."));
    }, 25000);

    client.add(magnetOrUrl, { path: TORRENT_CACHE_DIR }, (torrent: any) => {
      clearTimeout(timeout);
      torrent.on("ready", () => {
        resolve(formatTorrentDetails(torrent));
      });
      if (torrent.ready) {
        resolve(formatTorrentDetails(torrent));
      }
    });
  });
}

export async function getTorrent(infoHash: string): Promise<any> {
  const client = await getClient();
  return client.get(infoHash) ?? null;
}

export function formatTorrentDetails(torrent: any): TorrentDetails {
  const files: TorrentFileInfo[] = (torrent.files || []).map((file: any, index: number) => ({
    name: file.name,
    path: file.path,
    length: file.length,
    index,
  }));

  return {
    infoHash: torrent.infoHash,
    name: torrent.name || "Torrent Media",
    magnetURI: torrent.magnetURI,
    numPeers: torrent.numPeers || 0,
    downloaded: torrent.downloaded || 0,
    downloadSpeed: torrent.downloadSpeed || 0,
    progress: torrent.progress || 0,
    files,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { parseMediaInfo } from "@/app/lib/mediaParser";
import { formatBytes } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export interface TorrentSearchResult {
  id: string;
  title: string;
  year?: string | number;
  rating?: number;
  poster?: string;
  quality: string;
  size: string;
  seeds: number;
  peers: number;
  hash: string;
  magnet: string;
}

const TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.openbittorrent.com:80",
  "udp://tracker.coppersurfer.tk:6969",
  "udp://glotorrents.pw:6969/announce",
  "udp://tracker.leechers-paradise.org:6969",
].map((t) => `tr=${encodeURIComponent(t)}`).join("&");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const results: TorrentSearchResult[] = [];
    const seenHashes = new Set<string>();

    // Provider 1: YTS API
    try {
      const ytsUrl = `https://yts.mx/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&sort_by=seeds&limit=10`;
      const res = await fetch(ytsUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        next: { revalidate: 60 },
      });

      if (res.ok) {
        const data = await res.json();
        const movies = data?.data?.movies ?? [];

        for (const m of movies) {
          const title = m.title_long || m.title;
          const poster = m.medium_cover_image || m.small_cover_image;
          const year = m.year;
          const rating = m.rating;

          if (Array.isArray(m.torrents)) {
            for (const t of m.torrents) {
              const hash = (t.hash || "").toLowerCase();
              if (!hash || seenHashes.has(hash)) continue;
              seenHashes.add(hash);

              const magnet = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}&${TRACKERS}`;
              results.push({
                id: `yts_${hash}`,
                title: parseMediaInfo(title).cleanTitle,
                year,
                rating,
                poster,
                quality: t.quality ? `${t.quality} ${t.type ? t.type.toUpperCase() : ""}`.trim() : "HD",
                size: t.size || "Unknown",
                seeds: parseInt(t.seeds || 0, 10),
                peers: parseInt(t.peers || 0, 10),
                hash,
                magnet,
              });
            }
          }
        }
      }
    } catch {
      /* YTS provider fallback */
    }

    // Provider 2: Apibay / PirateBay public index API
    try {
      const apibayUrl = `https://apibay.org/q.php?q=${encodeURIComponent(query)}`;
      const res = await fetch(apibayUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        next: { revalidate: 60 },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data.slice(0, 15)) {
            if (!item.info_hash || item.name === "No results found") continue;

            const hash = item.info_hash.toLowerCase();
            if (seenHashes.has(hash)) continue;
            seenHashes.add(hash);

            const parsed = parseMediaInfo(item.name);
            const magnet = `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(item.name)}&${TRACKERS}`;
            const sizeBytes = parseInt(item.size || "0", 10);

            results.push({
              id: `pb_${hash}`,
              title: parsed.cleanTitle || item.name,
              year: parsed.year ? parseInt(parsed.year, 10) : undefined,
              quality: parsed.resolution || "HD",
              size: sizeBytes > 0 ? formatBytes(sizeBytes) : "Unknown",
              seeds: parseInt(item.seeders || 0, 10),
              peers: parseInt(item.leechers || 0, 10),
              hash,
              magnet,
            });
          }
        }
      }
    } catch {
      /* Apibay provider fallback */
    }

    // Sort by seeders descending
    results.sort((a, b) => b.seeds - a.seeds);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[soyo] Torrent search error:", error);
    return NextResponse.json({ results: [] });
  }
}

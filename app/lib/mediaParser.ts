export interface ParsedMedia {
  cleanTitle: string;
  year?: string;
  resolution?: string;
  source?: string;
  codec?: string;
  releaseGroup?: string;
}

const RESOLUTION_REGEX = /\b(2160p|4k|1080p|720p|576p|480p|360p)\b/i;
const YEAR_REGEX = /\b(19\d\d|20\d\d)\b/;
const SOURCE_REGEX = /\b(bluray|brrip|bdrip|web-dl|webrip|web|hdrip|dvdrip|dvd|hdtv)\b/i;
const CODEC_REGEX = /\b(x264|x265|h264|hevc|av1|xvid)\b/i;
const AUDIO_REGEX = /\b(aac|ac3|dts|dd5\.1|5\.1ch|2ch|7\.1)\b/i;

// Noise tags & group names to remove from clean title
const PREFIX_NOISE_REGEX = /^(\[[^\]]+\]|@[^\s]+|©|\(c\)|#\w+)\s*/i;
const SUFFIX_NOISE_REGEX = /\s*(\[[^\]]+\]|@[^\s]+|©|\(c\)|#\w+)$/i;
const RELEASE_GROUP_REGEX = /\b(yify|psa|lama|hl|rarbg|eztv|utr|qxr|galaxies|d3g|tgx)\b/i;

/**
 * Intelligently parses messy scene/torrent filenames into clean metadata.
 * Example: "[CC] Back to the Future 1985 1080p BrRip x264 YIFY"
 * Output: { cleanTitle: "Back to the Future", year: "1985", resolution: "1080p", source: "BRRip", codec: "x264" }
 */
export function parseMediaInfo(filename: string): ParsedMedia {
  // Strip file extension
  let name = filename.replace(/\.[^/.]+$/, "");

  // Clean leading symbols and release group tags like [CC], @BM Links, ©
  while (PREFIX_NOISE_REGEX.test(name)) {
    name = name.replace(PREFIX_NOISE_REGEX, "");
  }

  // Clean trailing noise like © or #English
  while (SUFFIX_NOISE_REGEX.test(name)) {
    name = name.replace(SUFFIX_NOISE_REGEX, "");
  }

  // Extract year
  const yearMatch = name.match(YEAR_REGEX);
  const year = yearMatch ? yearMatch[1] : undefined;

  // Extract resolution
  const resMatch = name.match(RESOLUTION_REGEX);
  const resolution = resMatch ? resMatch[1].toUpperCase() : undefined;

  // Extract source
  const sourceMatch = name.match(SOURCE_REGEX);
  let source = sourceMatch ? sourceMatch[1] : undefined;
  if (source) {
    // Normalize source casing
    const s = source.toLowerCase();
    if (s === "bluray") source = "BluRay";
    else if (s === "brrip") source = "BRRip";
    else if (s === "bdrip") source = "BDRip";
    else if (s === "web-dl" || s === "webrip" || s === "web") source = "WEB-DL";
    else if (s === "hdrip") source = "HDRip";
    else if (s === "dvdrip") source = "DVDRip";
  }

  // Extract codec
  const codecMatch = name.match(CODEC_REGEX);
  const codec = codecMatch ? codecMatch[1] : undefined;

  // Extract release group
  const groupMatch = name.match(RELEASE_GROUP_REGEX);
  const releaseGroup = groupMatch ? groupMatch[1] : undefined;

  // To find the clean title: truncate everything starting from the first metadata tag (Year, Resolution, Source, or Codec)
  let cleanTitle = name;

  // Replace dots, underscores, and hyphen separators with spaces (except inside titles like "Se7en")
  cleanTitle = cleanTitle.replace(/[._]+/g, " ");

  // Find index of the first technical tag
  const matches: number[] = [];

  if (yearMatch && yearMatch.index !== undefined) matches.push(yearMatch.index);
  if (resMatch && resMatch.index !== undefined) matches.push(resMatch.index);
  if (sourceMatch && sourceMatch.index !== undefined) matches.push(sourceMatch.index);
  if (codecMatch && codecMatch.index !== undefined) matches.push(codecMatch.index);

  if (matches.length > 0) {
    const firstTagIndex = Math.min(...matches);
    cleanTitle = name.substring(0, firstTagIndex);
  }

  // Final cleanup on title string
  cleanTitle = cleanTitle
    .replace(/^[\s\-_[\]()@©#]+|[\s\-_[\]()@©#]+$/g, "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Fallback to original name without extension if clean title is empty
  if (!cleanTitle) {
    cleanTitle = filename.replace(/\.[^/.]+$/, "").trim();
  }

  return {
    cleanTitle,
    year,
    resolution,
    source,
    codec,
    releaseGroup,
  };
}

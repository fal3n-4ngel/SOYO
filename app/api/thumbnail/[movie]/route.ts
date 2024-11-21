import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";
import path from "path";
import axios from "axios";
import { readConfig } from '@/app/lib/serverUtils';

function getMovieDir() {
  const config = readConfig();
  return config.movieDir || process.env.MOVIE_DIR || 'F:/';
}

// Fetch AniList Thumbnail (returns URL of the image)
async function fetchAniListThumbnail(movieName: string) {
  const query = `
    query {
      Media(search: "${movieName}", type: ANIME) {
        coverImage {
          large
        }
      }
    }
  `;

  const url = "https://graphql.anilist.co";
  const headers = {
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(url, JSON.stringify({ query }), { headers });
    console.log("AniList Response:", response.data);  // Log the full response
    const data = response.data.data.Media;
    if (data && data.coverImage && data.coverImage.large) {
      console.log("Found AniList Thumbnail:", data.coverImage.large);  // Log the thumbnail URL
      return data.coverImage.large;
    }
  } catch (error) {
    console.error("Error fetching AniList thumbnail:", error);
  }
  return null;
}

function cleanMovieName(movieName: string) {
  let cleanedName = movieName.replace(/\.(mkv|mp4|avi|flv|webm|mov|wmv|_|.|\+|-|-mkv|)$/i, '').trim();
  cleanedName = cleanedName.replace(/\b(720p|1080p|480p|HEVC|4K|HD|SD|BluRay|BRRip|HDRip)\b/g, '').trim();
  cleanedName = cleanedName.replace(/\b(Hindi|English|Tamil|Telugu|ESub|AAC|x264|x265|HEVC|WEB-DL|BluRay|Org|VCD|YIFY|YTS|AMZN|BiGiL)\b/g, '').trim();
  cleanedName = cleanedName.replace(/\[.*?\]/g, '').trim();
  cleanedName = cleanedName.replace(/_/g, ' ').trim();
  cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
  cleanedName = cleanedName.replace(/\b\d{4}\b/g, '').trim();
  return cleanedName;
}

// Fetch IMDb Thumbnail (returns URL of the image)
async function fetchIMDbThumbnail(movieName: string) {
  const apiKey = process.env.IMDB_API_KEY; // Use your OMDb API key here
  const cleanedName = cleanMovieName(movieName);

  const url = `http://www.omdbapi.com/?t=${cleanedName}&apikey=${apiKey}`;

  try {
    const response = await axios.get(url);
    if (response.data.Response === "True") {
      console.log("Found IMDb Thumbnail:", response.data.Poster);
      return response.data.Poster; // Return the poster URL
    }
  } catch (error) {
    console.error("Error fetching IMDb thumbnail:", error);
  }
  return null;
}

function saveThumbnailToFile(thumbnailUrl: string, movieName: string) {
  const movieDir = getMovieDir();
  const thumbnailPath = path.join(movieDir, 'thumbnails', `${movieName}.jpg`);

  return axios({
    url: thumbnailUrl,
    method: 'GET',
    responseType: 'stream',
  }).then(response => {
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(thumbnailPath);
      response.data.pipe(writer);

      writer.on('finish', () => resolve(thumbnailPath));
      writer.on('error', reject);
    });
  }).catch(err => {
    console.error("Error saving thumbnail:", err);
  });
}

export async function GET(request: NextRequest, { params }: { params: { movie: string } }) {
  const movieDir = getMovieDir();
  const { movie } = params;
  const movieNameWithoutExtension = movie.split(".").slice(0, -1).join(".");
  const thumbnailPath = path.join(movieDir, 'thumbnails', `${movieNameWithoutExtension}.jpg`);
  const defaultThumbnailPath = path.join(process.cwd(), 'public', 'default.jpg');

  // Check if the local thumbnail exists
  if (fs.existsSync(thumbnailPath)) {
    const thumbnailStat = fs.statSync(thumbnailPath);
    const thumbnailFileSize = thumbnailStat.size;
    const thumbnailRange = request.headers.get("range");

    if (thumbnailRange) {
      const parts = thumbnailRange.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : thumbnailFileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(thumbnailPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${thumbnailFileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": "image/jpeg",
      };
      return new NextResponse(Readable.toWeb(file) as ReadableStream, {
        status: 206,
        headers: head,
      });
    } else {
      const head = {
        "Content-Length": thumbnailFileSize.toString(),
        "Content-Type": "image/jpeg",
      };
      const file = fs.createReadStream(thumbnailPath);
      return new NextResponse(Readable.toWeb(file) as ReadableStream, {
        status: 200,
        headers: head,
      });
    }
  }

  // Fetch external thumbnails if not found locally
  let externalThumbnailUrl = await fetchIMDbThumbnail(movieNameWithoutExtension);
  if (!externalThumbnailUrl) {
    externalThumbnailUrl = await fetchAniListThumbnail(movieNameWithoutExtension);
  }

  const finalThumbnailUrl = externalThumbnailUrl || defaultThumbnailPath;

  // Cache the thumbnail if an external URL was fetched
  if (externalThumbnailUrl) {
    await saveThumbnailToFile(externalThumbnailUrl, movieNameWithoutExtension);
  }

  // Serve the thumbnail
  const thumbnailFile = fs.existsSync(finalThumbnailUrl) ? finalThumbnailUrl : defaultThumbnailPath;
  const thumbnailStat = fs.statSync(thumbnailFile);
  const thumbnailFileSize = thumbnailStat.size;
  const thumbnailRange = request.headers.get("range");

  if (thumbnailRange) {
    const parts = thumbnailRange.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : thumbnailFileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(thumbnailFile, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${thumbnailFileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize.toString(),
      "Content-Type": "image/jpeg",
    };
    return new NextResponse(Readable.toWeb(file) as ReadableStream, {
      status: 206,
      headers: head,
    });
  } else {
    const head = {
      "Content-Length": thumbnailFileSize.toString(),
      "Content-Type": "image/jpeg",
    };
    const file = fs.createReadStream(thumbnailFile);
    return new NextResponse(Readable.toWeb(file) as ReadableStream, {
      status: 200,
      headers: head,
    });
  }
}

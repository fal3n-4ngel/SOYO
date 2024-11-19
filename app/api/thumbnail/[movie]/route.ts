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

function cleanMovieName(movieName) {
  // Remove common video file extensions (.mkv, .mp4, .avi, etc.)
  let cleanedName = movieName.replace(/\.(mkv|mp4|avi|flv|webm|mov|wmv|_|.|\+|)$/i, '').trim();
  
  // Remove resolution details (720p, 1080p, etc.)
  cleanedName = cleanedName.replace(/\b(720p|1080p|4K|HD|SD|BluRay|BRRip|HDRip)\b/g, '').trim();
  
  // Remove language, format, codec, and other unnecessary details
  cleanedName = cleanedName.replace(/\b(Hindi|English|Tamil|Telugu|ESub|AAC|x264|x265|HEVC|WEB-DL|BluRay|Org|VCD|YIFY|YTS|AMZN|BiGiL)\b/g, '').trim();

  // Remove square brackets or anything inside them, including any special characters
  cleanedName = cleanedName.replace(/\[.*?\]/g, '').trim();
  
  // Remove underscores and other unwanted characters
  cleanedName = cleanedName.replace(/_/g, ' ').trim();
  
  // Remove extra spaces
  cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

  // Remove years (e.g., 2001, 1997, etc.)
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

export async function GET(request: NextRequest, { params }: { params: { movie: string } }) {
  const movieDir = getMovieDir();
  const { movie } = params;
  const movieNameWithoutExtension = movie.split(".").slice(0, -1).join(".");

  // Check if the local thumbnail exists
  const thumbnailPath = path.join(movieDir, 'thumbnails', `${movieNameWithoutExtension}.jpg`);
  const defaultThumbnailPath = path.join(process.cwd(), 'public', 'default.jpg');

  // If the local thumbnail exists, serve it
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

  // If no local thumbnail, try fetching external thumbnails (AniList or IMDb)
  let externalThumbnailUrl = await fetchIMDbThumbnail(movieNameWithoutExtension);

  if (!externalThumbnailUrl) {
    // If AniList thumbnail is not available, fetch IMDb thumbnail
    externalThumbnailUrl = await fetchAniListThumbnail(movieNameWithoutExtension);
  }

  // If no external thumbnail is found, use the default thumbnail
  const finalThumbnailUrl = externalThumbnailUrl || defaultThumbnailPath;

  // If external thumbnail URL was found, fetch the image and return it
  if (externalThumbnailUrl) {
    try {
      const response = await axios.get(externalThumbnailUrl, { responseType: 'stream' });
      const headers = {
        "Content-Type": response.headers['content-type'],
        "Content-Length": response.headers['content-length'],
      };
      return new NextResponse(Readable.toWeb(response.data) as ReadableStream, {
        status: 200,
        headers: headers,
      });
    } catch (error) {
      console.error("Error fetching image from external URL:", error);
    }
  }

  // If no external image, fall back to the default thumbnail
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

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { readConfig } from '@/app/lib/serverUtils';

function getMovieDir() {
  const config = readConfig();
  return config.movieDir || 'G:/'; // Default directory if not specified
}

// Helper function to search for the movie in the directory (only in subdirectories if not found in main)
function findMovieFile(movieName: string, dir: string): string | null {
  const mainDirFiles = fs.readdirSync(dir);
  const foundInMain = mainDirFiles.find((file) => file === movieName);

  if (foundInMain) {
    // File found in the main directory, return its path
    return path.join(dir, foundInMain);
  }

  // If not found in main, search in subdirectories
  const subDirs = mainDirFiles.filter((file) => fs.statSync(path.join(dir, file)).isDirectory());
  
  for (const subDir of subDirs) {
    const subDirPath = path.join(dir, subDir);
    const result = findMovieFile(movieName, subDirPath); // Recursive search in subdir
    if (result) {
      return result; // Return the found file from subdirectory
    }
  }

  return null; // Return null if the file is not found
}

export async function GET(
  request: NextRequest,
  { params }: { params: { movie: string } }
) {
  const movieDir = getMovieDir();
  const { movie } = params;

  // Decode movie name and attempt to find the file (search in main directory first)
  const decodedMovieName = decodeURIComponent(movie);
  const filePath = findMovieFile(decodedMovieName, movieDir);

  if (!filePath) {
    return new NextResponse('File not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = request.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize.toString(),
      'Content-Type': 'video/mp4',
    };
    return new NextResponse(Readable.toWeb(file) as ReadableStream, { status: 206, headers: head });
  } else {
    const head = {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'video/mp4',
    };
    const file = fs.createReadStream(filePath);
    return new NextResponse(Readable.toWeb(file) as ReadableStream, { status: 200, headers: head });
  }
}

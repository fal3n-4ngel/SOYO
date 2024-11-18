import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MOVIE_DIR = process.env.MOVIE_DIR || 'F:/'; // Default to 'F:/' if not set

function getMoviesRecursively(dir: string) {
  let results: { name: string; thumbnail: string }[] = [];

  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // If it's a directory, recurse into it
    if (stat && stat.isDirectory()) {
      results = results.concat(getMoviesRecursively(filePath));
    } else {
      // If it's a movie file, add it to the results
      if (file.endsWith('.mp4') || file.endsWith('.avi') || file.endsWith('.mkv')) {
        if(file[0]=='$'){}
        else{
        results.push({
          name: file,
          thumbnail: `/api/thumbnail/${encodeURIComponent(file)}`,
        });
      }
      }
    }
  });

  return results;
}

export async function GET() {
  
  const movies = getMoviesRecursively(MOVIE_DIR);

  return NextResponse.json(movies);
}

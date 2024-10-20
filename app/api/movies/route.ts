import { NextResponse } from 'next/server';
import fs from 'fs';

const MOVIE_DIR = 'F:/';


export async function GET() {
  const movies = fs.readdirSync(MOVIE_DIR)
    .filter(file => file.endsWith('.mp4') || file.endsWith('.avi') || file.endsWith('.mkv'))
    .map(movie => {

      return {
        name: movie,
        thumbnail: `/api/thumbnail/${encodeURIComponent(movie)}` 
      };
    });

  return NextResponse.json(movies);
}

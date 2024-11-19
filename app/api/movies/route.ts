import {
  getMoviesRecursively,
  readConfig,
  writeConfig,
} from "@/app/lib/serverUtils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const config = readConfig();
    const movieDir = config.movieDir || "G:/";
    const movies = getMoviesRecursively(movieDir);

    return NextResponse.json(movies);
  } catch (error) {
    console.error("Error fetching movies:", error);
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { movieDir } = body as { movieDir: string };

    if (!movieDir) {
      return NextResponse.json(
        { error: "Invalid movie directory" },
        { status: 400 }
      );
    }

    const config = readConfig();
    config.movieDir = movieDir; 
   
    writeConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating movie directory:", error);
    return NextResponse.json(
      { error: "Failed to update movie directory" + error},
      { status: 500 }
    );
  }
}
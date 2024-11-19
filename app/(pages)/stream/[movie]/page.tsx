"use client";
import React, { useState, useEffect, useCallback } from "react";
import VideoPlayer from "@/app/components/VideoPlayer";
import Link from "next/link";

interface Movie {
  name: string;
  thumbnail: string;
}

export default function StreamPage({ params }: { params: { movie: string } }) {
  const decodedMovie = decodeURIComponent(params.movie);
  const [isLoading, setIsLoading] = useState(true);
  const [upNext, setUpNext] = useState<Movie[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load dark mode preference from localStorage
  useEffect(() => {
    const storedDarkMode = localStorage.getItem("isDarkMode");
    if (storedDarkMode !== null) {
      setIsDarkMode(JSON.parse(storedDarkMode));
    }
  }, []);

  // Fetch movies and handle recently watched
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch("/api/movies");
        if (!response.ok) throw new Error("Failed to fetch movies");
        const data = await response.json();

        // Filter and set "Up Next" movies
        const filteredMovies = data
          .filter((movie: Movie) => movie.name !== decodedMovie)
          .slice(0, 5);
        setUpNext(filteredMovies);

        // Update recently watched
        const currentMovie = data.find((movie: Movie) => movie.name === decodedMovie);
        if (currentMovie) {
          const recentlyWatched = JSON.parse(localStorage.getItem("recentlyWatched") || "[]");
          const updatedRecent = [
            currentMovie,
            ...recentlyWatched.filter((m: Movie) => m.name !== currentMovie.name),
          ].slice(0, 10);
          localStorage.setItem("recentlyWatched", JSON.stringify(updatedRecent));
        }
      } catch (error) {
        console.error("Error fetching movies:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMovies();
  }, [decodedMovie]);

  // Format movie titles
  const formatTitle = useCallback((name: string) => {
    return name
      .replaceAll("_", " ")
      .replaceAll("@", " ")
      .replaceAll(".", " ")
      .replace(/\[MZM\]|mkv|mp4|avi|CV/g, "")
      .trim();
  }, []);

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center min-h-screen ${
          isDarkMode ? "bg-[#141414] text-white" : "bg-white text-black"
        }`}
      >
        <div className="loader w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors  bg-white text-black`}>
      {/* Navbar */}
      <nav className="fixed bg-white w-full z-50 ">
        <div className="container mx-auto flex justify-between items-center px-6 py-4">
          <Link href="/" className="text-3xl font-bold dancing-script text-black">
            SOYO
          </Link>
          <div className="hidden md:flex space-x-6 text-black">
          <Link
            href="/"
            className="group relative inline-block hover:cursor-pointer"
          >
            <span className="py-2 text-black">HOME</span>
            <span className="absolute left-0 top-8 h-[2px] w-0 bg-black transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link
            href="/#continue"
            className="group relative inline-block hover:cursor-pointer"
          >
            <span className="py-2 text-black">TRENDING</span>
            <span className="absolute left-0 top-8 h-[2px] w-0 bg-black transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link
            href="/#explore"
            className="group relative inline-block hover:cursor-pointer"
          >
            <span className="py-2 text-black">EXPLORE</span>
            <span className="absolute left-0 top-8 h-[2px] w-0 bg-black transition-all duration-300 group-hover:w-full"></span>
          </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto flex flex-col md:flex-row gap-8 px-6 py-20 md:py-[150px] ">
        {/* Video Player Section */}
        <div className="w-full md:w-3/4 ">
          <VideoPlayer movie={params.movie} />
          <h2 className="text-lg sm:text-xl font-semibold mt-4 text-gray-800">
        {decodedMovie
          .replaceAll("_", " ")
          .replaceAll("@", " ")
          .replaceAll(".", " ")
          .replaceAll("[MZM]", " ")
          .replace(/\.(mkv|mp4|avi|CV)/g, " ")}
      </h2>
        </div>

        {/* Up Next Section */}
        <aside className="w-full md:w-1/4">
          <h3 className="text-2xl font-semibold mb-4 quicksand">Up Next</h3>
          <div className="space-y-4">
            {upNext.map((video, index) => (
              <Link
                key={index}
                href={`/stream/${encodeURIComponent(video.name)}`}
                className="flex gap-4 items-center rounded-lg  p-2 transition-all shadow-sm bg-[#f0f0f0] hover:scale-105 "
              >
                <div className="w-24 h-16 flex-shrink-0 rounded-md overflow-hidden">
                  <img src={video.thumbnail} alt={video.name} className="w-full h-full object-cover" />
                </div>
                <p className="font-medium line-clamp-2">{formatTitle(video.name)}</p>
              </Link>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MovieListBox from "./MovieListBox";

interface Movie {
  name: string;
  thumbnail: string;
}

const availableDrives = ["F:/","G:/", "H:/", "I:/"]; // Add more drives as needed

export default function MovieList() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDrive, setSelectedDrive] = useState<string>(availableDrives[0]); // Default to the first drive

  useEffect(() => {
    fetch(`/api/movies?drive=${encodeURIComponent(selectedDrive)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch movies");
        return res.json();
      })
      .then((data) => {
        setMovies(data);
        setFilteredMovies(data); // Initialize filtered movies
      })
      .catch((err) => setError(err.message));
  }, [selectedDrive]); // Re-fetch movies when the selected drive changes

  useEffect(() => {
    // Filter movies based on search query
    if (searchQuery.trim() === "") {
      setFilteredMovies(movies);
    } else {
      setFilteredMovies(
        movies.filter((movie) =>
          movie.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, movies]);

  if (error)
    return <div className="text-red-500 text-center mt-10">{error}</div>;

  return (
    <div className="flex flex-col md:w-[90%] mx-auto p-5">
      <nav className="flex w-full flex-row justify-between items-center py-5">
        <a
          href="https://www.adithyakrishnan.com"
          className="md:w-[200px] text-black playwrite md:flex hidden"
        >
          ©️fal3n-4ngel
        </a>
        <div className="flex flex-col justify-center items-center md:w-[300px]">
          <h1 className="text-[#1d1d1d] font-semibold md:text-3xl dancing-script">
            SOYO
          </h1>
        </div>
        {/* Drive Selection Dropdown */}
        {/* <select
          className="border border-gray-300 rounded-lg p-2 mr-2"
          value={selectedDrive}
          onChange={(e) => setSelectedDrive(e.target.value)}
        >
          {availableDrives.map((drive) => (
            <option key={drive} value={drive}>
              {drive}
            </option>
          ))}
        </select> */}
        {/* Search Bar */}
        <div className="max-w-[200px] relative md:w-[200px] h-fit">
          <svg
            className="absolute left-4 top-[20%] my-auto w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            className="pl-12 px-4 py-2 w-full bg-[#efefef] text-sm text-gray-400 rounded-full border border-transparent focus:ring-[1px] focus:bg-white focus:ring-[#ffcccc] focus:outline-none transition-all duration-150"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </nav>
      <div className="md:p-10 pt-20">
        <div className="w-full flex justify-center items-center flex-col">
          <h1 className="text-5xl text-black font-semibold playwrite text-center">Discover Movies</h1>
          <h2 className="text-gray-500 text-xs p-4 text-center w-[75%]">SOYO - Stream Own Your Own. Effortlessly stream files from your local system via Wi-Fi and enjoy your personal collection anywhere in your home.</h2>
        </div>

        <div className="max-w-[250px] relative h-fit mx-auto md:hidden flex">
          <svg
            className="absolute left-4 top-[30%] my-auto w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            className="pl-12 px-4 py-2 w-full bg-[#efefef] text-xl text-gray-400 rounded-full border border-transparent focus:ring-[1px] focus:bg-white focus:ring-[#ffcccc] focus:outline-none transition-all duration-150"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Movie Grid */}
        <div className="flex flex-wrap md:gap-4 sm:gap-6 md:flex-row flex-col justify-center items-center">
          {filteredMovies.length > 0 ? (
            filteredMovies.map((movie) => (
              <Link
                key={movie.name}
                href={`/stream/${encodeURIComponent(movie.name)}`}
              >
                <MovieListBox name={movie.name} thumbnail={movie.thumbnail} />
              </Link>
            ))
          ) : (
            <div className="text-gray-500 col-span-full text-center">
              No movies found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

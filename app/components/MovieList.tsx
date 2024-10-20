"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Film } from 'lucide-react';
import MovieListBox from "./MovieListBox";

interface Movie {
  name: string;
  thumbnail: string;
}

//const availableDrives = ["F:/", "G:/", "H:/", "I:/"];

export default function MovieList() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  //const [selectedDrive, setSelectedDrive] = useState<string>(availableDrives[0]);

  useEffect(() => {
    fetch(`/api/movies`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch movies");
        return res.json();
      })
      .then((data) => {
        setMovies(data);
        setFilteredMovies(data);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
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
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500 text-xl bg-red-100 p-4 rounded-lg shadow-lg">
          {error}
        </div>
      </div>
    );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <nav className="flex w-full flex-row justify-between items-center py-5 px-5  ">
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
        <div className="max-w-[200px] relative md:w-[200px] h-fit">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            className="pl-12 px-4 py-2 w-full bg-[#efefef] text-sm text-gray-400 rounded-full border border-transparent focus:ring-2 focus:ring-purple-400 focus:outline-none transition-all duration-300"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </nav>

      <main className="flex-grow px-5 py-8">
        <div className="mb-12 text-center">
          <h2 className="text-5xl font-bold text-gray-800 playwrite mb-4">Discover Movies</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            SOYO - Stream Own Your Own. Effortlessly stream files from your local system via Wi-Fi and enjoy your personal collection anywhere in your home.
          </p>
        </div>

        {/* <div className="mb-8 flex justify-center">
          <select
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
            value={selectedDrive}
            onChange={(e) => setSelectedDrive(e.target.value)}
          >
            {availableDrives.map((drive) => (
              <option key={drive} value={drive}>
                {drive}
              </option>
            ))}
          </select>
        </div> */}

        {filteredMovies.length > 0 ? (
          <div className="flex flex-wrap justify-center items-center w-[90%] mx-auto">
            {filteredMovies.map((movie) => (
              <Link
                key={movie.name}
                href={`/stream/${encodeURIComponent(movie.name)}`}
              >
                <MovieListBox name={movie.name} thumbnail={movie.thumbnail} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-12">
            <Film size={64} className="mx-auto mb-4" />
            <p className="text-xl">No movies found</p>
          </div>
        )}
      </main>
    </div>
  );
}
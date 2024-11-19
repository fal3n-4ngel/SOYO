"use client"
import React, { useState, useEffect } from 'react';
import VideoPlayer from "@/app/components/VideoPlayer";
import Link from 'next/link';


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
    const storedDarkMode = localStorage.getItem('isDarkMode');
    if (storedDarkMode !== null) {
      setIsDarkMode(JSON.parse(storedDarkMode));
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 10);

    fetch('/api/movies')
      .then(response => response.json())
      .then(data => {
        const filteredMovies = data
          .filter((movie: { name: string; }) => movie.name !== decodedMovie)
          .slice(0, 5);
        setUpNext(filteredMovies);
        
        // Update recently watched in localStorage
        const recentlyWatched = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');
        const currentMovie = data.find((m: { name: string; }) => m.name === decodedMovie);
        if (currentMovie) {
          const updatedRecent = [
            currentMovie,
            ...recentlyWatched.filter((m: Movie) => m.name !== currentMovie.name)
          ].slice(0, 10);
          localStorage.setItem('recentlyWatched', JSON.stringify(updatedRecent));
        }
      })
      .catch(error => console.error('Error fetching up next videos:', error));

    return () => clearTimeout(timer);
  }, [decodedMovie]);

 

  const formatTitle = (name: string) => {
    return name
      .replaceAll("_", " ")
      .replaceAll("@", " ")
      .replaceAll(".", " ")
      .replaceAll("[MZM]", " ")
      .replaceAll("mkv", " ")
      .replaceAll("mp4", " ")
      .replaceAll("avi", " ")
      .replaceAll("CV", " ")
      .trim();
  };

  if (isLoading) {
    return (
      <div className={`w-full min-h-screen flex flex-col justify-center items-center ${
        isDarkMode ? 'bg-[#141414] text-white' : 'bg-white text-black'
      }`}>
        <div className="w-24 h-24 border-4 border-current rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 bg-[#fdfdfd]`}>
  <nav className={`fixed bg-[#fdfdfd] w-full  z-[50] max-w-screen overflow-x-hidden transition-all duration-300 `}>
        <div className="flex items-start md:justify-between md:gap-0 gap-4 justify-start px-6 py-4">
          <div className="flex items-center space-x-8">
            <a href="/" className={`text-3xl dancing-script font-bold text-black`}>
              SOYO
            </a>
            <div className={`hidden md:flex space-x-6 text-black`}>
              <Link href="/" className="hover:text-blue-900">Home</Link>
              <Link href="/#continue" className="hover:text-blue-900">Continue</Link>
              <Link href="/#explore" className="hover:text-blue-900">Explore</Link>
           
            </div>
          </div>

        
            
            
        
        </div>
      </nav>

      <main className="flex flex-col md:flex-row gap-8 p-6">
        <div className="w-full md:w-3/4 space-y-4 mt-20">
          <div className={`rounded-lg overflow-hidden `}>
            <VideoPlayer movie={params.movie} />
          </div>
          
        
        </div>

        <aside className="w-full md:w-1/4">
          <h3 className={`text-lg font-medium mb-4 mt-10 
            text-black
          `}>
            Up Next
          </h3>
          <div className="space-y-4">
            {upNext.map((video, index) => (
              <Link 
                href={`/stream/${encodeURIComponent(video.name)}`} 
                key={index}
                className={`block rounded-lg overflow-hidden transition-all duration-300 `}
              >
                <div className="flex gap-3 p-2">
                  <div className="w-40 h-24 rounded-md overflow-hidden flex-shrink-0">
                    <img 
                      src={video.thumbnail} 
                      alt={video.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className={`font-medium line-clamp-2 text-gray-700`}>
                      {formatTitle(video.name)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
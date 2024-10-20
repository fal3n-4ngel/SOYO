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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 10);

    fetch('/api/movies')
      .then(response => response.json())
      .then(data => setUpNext(data.filter((movie: { name: string; }) => movie.name !== decodedMovie).slice(0, 3)))
      .catch(error => console.error('Error fetching up next videos:', error));

    return () => clearTimeout(timer);
  }, [decodedMovie]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex flex-col justify-center items-center bg-[#fdfdfd]">
        <div className="w-24 h-24 border-4 border-current rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fdfdfd] mx-auto justify-between items-center px-4 py-8">
      <nav className="flex w-full flex-row justify-between items-center py-5">
        <a
          href="https://www.adithyakrishnan.com"
          className="md:w-[200px] text-black playwrite md:flex hidden"
        >
          ©️fal3n-4ngel
        </a>
        <div className="flex flex-col justify-center items-center md:w-[300px]">
          <a href="/" className="text-[#1d1d1d] font-semibold md:text-3xl dancing-script">
            SOYO
          </a>
        </div>
        <div className="max-w-[200px] relative md:w-[200px] h-fit">
        <a
          href="https://www.adithyakrishnan.com"
          className="md:w-[200px] text-black playwrite md:hidden flex "
        >
          ©️fal3n-4ngel
        </a>
        </div>
      </nav>

      <main className="flex flex-col md:flex-row gap-8 mt-8">
        <div className="w-full md:w-3/4">
          <VideoPlayer movie={params.movie} />
          
        </div>

        <aside className="w-full md:w-1/4 overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 text-[#1d1d1d]">Up next</h3>
          {upNext.map((video, index) => (
            <Link href={`/stream/${encodeURIComponent(video.name)}`} key={index}>
              <div className="flex mb-4 hover:bg-gray-100 p-2 rounded transition duration-300 cursor-pointer">
                <img src={video.thumbnail} alt={video.name} className="w-40 h-24 object-cover rounded" />
                <div className="ml-2">
                  <p className="font-semibold text-[#1d1d1d]">{video.name.replaceAll("_"," ").replaceAll("@"," ").replaceAll("."," ").replaceAll("[MZM]"," ").replaceAll("mkv"," ").replaceAll("mp4"," ").replaceAll("avi"," ").replaceAll("CV"," ")}</p>
                </div>
              </div>
            </Link>
          ))}
        </aside>
      </main>
      <div></div>
    </div>
  );
}
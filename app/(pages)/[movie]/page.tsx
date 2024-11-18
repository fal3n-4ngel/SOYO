"use client"
import VideoPlayer from "@/app/components/VideoPlayer";
import { useState, useEffect } from "react";

export default function StreamPage({ params }: { params: { movie: string } }) {
  const decodedMovie = decodeURIComponent(params.movie);
  const [isLoading, setIsLoading] = useState(true);
 

  useEffect(() => {
    // Simulate a delay to demonstrate the loading indicator
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 10);

    return () => clearTimeout(timer);
  }, []);


  if (isLoading) {
    return (
      <div className="w-full bg-[#fdfdfd] mx-auto px-4 py-8 bg-background text-text dark:bg-darkBackground dark:text-darkText">
        <div className="flex justify-center items-center h-screen">
          <div className="w-24 h-24 border-4 border-current rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full min-h-screen bg-[#fdfdfd] mx-auto px-4 py-8 overflow-x-hidden">
      <div className="mb-4">
        <h1 className="text-xl font-bold mb-4 text-center text-black">{decodedMovie}</h1>
      </div>
      <VideoPlayer movie={params.movie} />
    </div>
  );
}

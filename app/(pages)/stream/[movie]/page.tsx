"use client";
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
      <div className="w-full min-h-screen flex flex-col justify-center items-center bg-[#fdfdfd] mx-auto px-4 py-8  ">
        <div className="flex justify-center items-center h-screen">
          <div className="w-24 h-24 border-4 border-current rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col justify-center  bg-[#fdfdfd] mx-auto px-4 py-8 ">
      <div className="mx-auto w-full  overflow-hidden md:w-[80%] ">
        <VideoPlayer movie={params.movie} />
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-4 text-center text-black">
            {decodedMovie}
          </h1>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { Play, Info } from 'lucide-react';

interface MovieListBoxProps {
  name: string;
  thumbnail: string;
}

export default function MovieListBox({ name, thumbnail }: MovieListBoxProps) {
  const formattedName = name.replaceAll("@CV","").replaceAll("@","").replaceAll("."," ").replaceAll("_"," ").replaceAll("[MZM]"," ");

  return (
    <div className="w-[80vw] md:w-[20vw] m-2 bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer group">
      {/* Movie Thumbnail */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-200">
        <img 
          src={thumbnail} 
          alt={formattedName} 
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button className="bg-white text-black rounded-full p-3 mx-2 hover:bg-opacity-90 transition-all duration-200">
            <Play size={24} />
          </button>
          <button className="bg-white text-black rounded-full p-3 mx-2 hover:bg-opacity-90 transition-all duration-200">
            <Info size={24} />
          </button>
        </div>
      </div>

      {/* Movie Title */}
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-800 truncate">{formattedName}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().getFullYear()} • Video File
        </p>
      </div>
    </div>
  );
}
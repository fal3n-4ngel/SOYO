import React from "react";

interface MovieListBoxProps {
  name: string;
  thumbnail: string;
}

export default function MovieListBox({ name, thumbnail }: MovieListBoxProps) {
  return (
    <div className="w-[80vw] md:w-[300px] m-2 flex flex-col justify-between items-center bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden cursor-pointer p-4">
      {/* Movie Thumbnail */}
      <div className="w-full aspect-[16/9] overflow-hidden rounded-lg bg-gray-100 mb-3">
        <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
      </div>

      {/* Movie Title */}
      <div className="w-full text-center mb-2">
        <h2 className="text-base font-medium text-gray-700 truncate">{name}</h2>
      </div>

   
    </div>
  );
}

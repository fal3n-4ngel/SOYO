import React from "react";

interface MovieListBoxProps {
  name: string;
  thumbnail: string;
}

export default function MovieListBox({ name, thumbnail }: MovieListBoxProps) {
  return (
    <div className="max-w-[300px] flex flex-col justify-center items-center bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="w-full h-48 bg-gray-200">
        <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4 w-full text-center">
        <h2 className="text-sm font-light text-gray-800 truncate">{name}</h2>
      </div>
    </div>
  );
}

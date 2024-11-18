import { GithubIcon, Info, Link } from "lucide-react";
import React from "react";

function Page() {
  return (
    <div
      className={`flex items-center justify-center h-screen bg-[#fdfdfd] w-full`}
    >
      <div className=" w-full h-full  flex items-center justify-center px-6 md:px-12">
        <div className="w-full space-y-6 flex-col justify-center items-center ">
          <div className="flex flex-col gap-4 justify-start items-center">
            <img src="/logo.png" alt="SOYO" className="w-[200px]" />
            <h1 className="text-5xl md:text-9xl font-bold dancing-script text-black">
              SOYO
            </h1>
          </div>
          <div className="w-full flex flex-col gap-4 justify-center items-center">
            <p className="text-5xl text-red-400 max-w-xl text-center quicksand ">
            404
            </p>
            <p className="text-xl text-black py-2">
             PAGE NOT FOUND
            </p>
            <div className="flex space-x-4">
              <Link
                href={`https://github.com/fal3n-4ngel/SOYO`}
                className="flex items-center space-x-2 px-8 py-3 bg-black text-white rounded-md hover:bg-gray-200 transition-colors duration-300"
              >
                <GithubIcon size={24} />
                <span>Github</span>
              </Link>
              <button className="flex items-center space-x-2 px-8 py-3 bg-gray-500/70 text-white rounded-md hover:bg-gray-500/90 transition-colors duration-300">
                <Info size={24} />
                <span>Readme</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page;

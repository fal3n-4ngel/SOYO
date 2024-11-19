"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Folder, Search, Play, GithubIcon } from "lucide-react";

interface Movie {
  name: string;
  thumbnail: string;
}

const MovieRowContinue = ({
  title,
  movies,
}: {
  title: string;
  movies: Movie[];
  isDarkMode: boolean;
}) => (
  <div className="mb-8 custom-scrollbar overflow-x-hidden ">
    <h3 className="text-3xl font-medium mb-4 px-6 quicksand">{title}</h3>
    <div className="relative">
      <div className="flex flex-row overflow-x-auto gap-4 justify-start item-center px-6 pb-4 no-scrollbar">
        {movies.map((movie) => (
          <div key={movie.name}>
            {movie.name[0] != "$" && (
              <Link
                href={`/stream/${encodeURIComponent(movie.name)}`}
                className="flex-none"
              >
                <div className="w-[150px] md:w-[200px] group">
                  <div className="aspect-[9/12] relative rounded-md overflow-hidden transition-transform duration-300 group-hover:scale-105">
                    <img
                      src={movie.thumbnail}
                      alt={movie.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <p className={`mt-2 text-sm text-gray-700  `}>
                    {movie.name
                      .replaceAll("-", " ")
                      .replaceAll(".", " ")
                      .replace(".mp4", "")
                      .replace(".avi", "")
                      .replace(".mkv", "")
                      .replaceAll("_", " ")}
                  </p>
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);

const MovieRow = ({
  title,
  movies,
}: {
  title: string;
  movies: Movie[];
  isDarkMode: boolean;
}) => (
  <div className="w-full mb-8 custom-scrollbar">
    <h3 className="text-3xl font-medium mb-4 px-6 quicksand">{title}</h3>
    <div className="relative">
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 md:gap-8   px-6 pb-4 no-scrollbar ">
        {movies.map((movie) => (
          <Link
            key={movie.name}
            href={`/stream/${encodeURIComponent(movie.name)}`}
            className="flex-none mx-auto"
          >
            <div className="md:w-[200px] w-[150px] group">
              <div className="aspect-[9/12] max-w-[200px] relative rounded-md overflow-hidden transition-transform duration-300 group-hover:scale-105">
                <img
                  src={movie.thumbnail}
                  alt={movie.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Play className="w-12 h-12 text-white" />
                </div>
              </div>
              <p className={`mt-2 text-sm text-gray-700 `}>
                {movie.name
                  .replaceAll("-", " ")
                  .replace(".mp4", "")
                  .replaceAll(".", " ")
                  .replace(".avi", "")
                  .replace(".mkv", "")
                  .replaceAll("_", " ")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export default function MovieList() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [recentlyWatched, setRecentlyWatched] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");

  const handlePathSelection = async () => {
    try {
      const response = await fetch("/api/movies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          movieDir: selectedPath || localStorage.getItem("MOVIE_DIR") || "G:/",
        }),
      });

      if (!response.ok) throw new Error("Failed to update movie directory");

      localStorage.setItem("MOVIE_DIR", selectedPath);
      console.log("Path set to:", selectedPath);

      // Refresh movies after setting new path
      const moviesResponse = await fetch("/api/movies");
      if (!moviesResponse.ok) throw new Error("Failed to fetch movies");

      const data = await moviesResponse.json();
      setMovies(data);
      setFilteredMovies(data);
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error("Error selecting directory:", error);
      alert("An error occurred while selecting directory");
    }
  };

  useEffect(() => {
    fetch(`/api/movies`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch movies");
        return res.json();
      })
      .then((data) => {
        setMovies(data);
        setFilteredMovies(data);
        // Simulate recently watched by taking last 5 movies
        const value = data.slice(-Math.min(Math.floor(Math.random() * 6), 5));
        setRecentlyWatched(value);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMovies(movies);
      setIsSearching(false);
    } else {
      setIsSearching(true);
      setFilteredMovies(
        movies.filter((movie) =>
          movie.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, movies]);

  if (error)
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
                Failed to fetch movies
              </p>
              <p className="text-xl text-black py-2">
                Please verify the file location specified in{" "}
                <code className="code-highlight">.env.local</code>.
              </p>
              <div className="flex md:flex-row flex-col space-x-4">
                <a
                  href={`https://github.com/fal3n-4ngel/SOYO`}
                  className="flex items-center space-x-2 px-8 py-3 bg-black text-white rounded-md hover:bg-gray-200 transition-colors duration-300"
                >
                  <GithubIcon size={24} />
                  <span>Github</span>
                </a>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2 px-4 py-3 bg-gray-100 rounded-md">
                    <input
                      type="text"
                      value={selectedPath}
                      onChange={(e) => setSelectedPath(e.target.value)}
                      list="drives"
                      placeholder="Enter movie directory path"
                      className="w-full bg-transparent outline-none text-black"
                    />
                    <datalist id="drives">
                      <option value="E:/">E Drive</option>
                      <option value="F:/">F Drive</option>
                      <option value="G:/">G Drive</option>
                    </datalist>
                  </div>
                  <button
                    onClick={handlePathSelection}
                    className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-300"
                  >
                    <Folder size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  // Featured movie is the first movie in the list
  const featuredMovie = movies[0];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 text-black bg-[#fdfdfd] w-full`}
    >
      {/* Navigation */}
      <nav
        className={`fixed bg-[#fdfdfd] w-full  z-[50] max-w-screen overflow-x-hidden transition-all duration-300 `}
      >
        <div className="flex items-start md:justify-between md:gap-0 gap-4 justify-start px-6 py-4">
          <div className="flex items-center space-x-8">
            <a
              href="/"
              className={`text-4xl dancing-script font-bold text-black`}
            >
              SOYO
            </a>
            <div className={`hidden md:flex space-x-6 text-black`}>
            <Link
            href="/"
            className="group relative inline-block hover:cursor-pointer"
          >
            <span className="py-2 text-black">HOME</span>
            <span className="absolute left-0 top-8 h-[2px] w-0 bg-black transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link
            href="/#continue"
            className="group relative inline-block hover:cursor-pointer"
          >
            <span className="py-2 text-black">TRENDING</span>
            <span className="absolute left-0 top-8 h-[2px] w-0 bg-black transition-all duration-300 group-hover:w-full"></span>
          </Link>
          <Link
            href="/#explore"
            className="group relative inline-block hover:cursor-pointer"
          >
            <span className="py-2 text-black">EXPLORE</span>
            <span className="absolute left-0 top-8 h-[2px] w-0 bg-black transition-all duration-300 group-hover:w-full"></span>
          </Link>
            </div>
          </div>

          <div className="flex w-full justify-end   ">
            <div className="relative max-w-[200px]">
              <Search
                className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${
                  isSearchFocused ? "text-red-600" : "text-gray-500"
                }`}
                size={18}
              />
              <input
                type="text"
                className={`pl-12 pr-4 py-2 w-[200px] text-sm rounded-full transition-all duration-300   focus:ring-2 focus:ring-violet-600 border focus:border-transparent focus:outline-none`}
                placeholder="Search movies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        {!isSearching && featuredMovie && (
          <div className="relative h-[80vh] w-full">
            <div className="absolute inset-0"></div>

            <div className=" w-full h-full  flex items-center justify-center px-6 md:px-12">
              <div className="w-full space-y-6 flex-col justify-center items-center ">
                <div className="flex flex-col gap-4 justify-start items-center">
                  <img src="/logo.png" alt="SOYO" className="w-[200px]" />
                  <h1 className="text-5xl md:text-9xl font-bold dancing-script text-black">
                    SOYO
                  </h1>
                </div>
                <div className="w-full flex flex-col gap-4 justify-center items-center">
                  <p className="text-lg text-gray-700 max-w-xl text-center playwrite">
                    Stream your favorite movies with SOYO - your personal
                    streaming service that lets you enjoy your media collection
                    anywhere in your home.
                  </p>
                  <div className="flex md:flex-row flex-col justify-center items-center gap-4 space-x-4 z-[10]">
                    <a
                      href="https://github.com/fal3n-4ngel/SOYO"
                      className="   max-w-fit  flex items-center space-x-2 px-8 py-3 bg-black text-white rounded-md hover:bg-gray-200 transition-colors duration-300"
                    >
                      <GithubIcon size={24} />
                      <span>Github</span>
                    </a>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2 px-4 py-3 bg-gray-100 rounded-md">
                        <input
                          type="text"
                          value={selectedPath}
                          onChange={(e) => setSelectedPath(e.target.value)}
                          list="drives"
                          placeholder="Enter movie directory path"
                          className="w-full bg-transparent outline-none text-black"
                        />
                        <datalist id="drives">
                          <option value="E:/">E Drive</option>
                          <option value="F:/">F Drive</option>
                          <option value="G:/">G Drive</option>
                        </datalist>
                      </div>
                      <button
                        onClick={handlePathSelection}
                        className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-300"
                      >
                        <Folder size={24} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 mt-10 pb-12 space-y-8">
          {isSearching ? (
            <div className="px-6 pt-32">
              <h2 className="text-2xl font-medium mb-6">Search Results</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredMovies.map((movie) => (
                  <Link
                    key={movie.name}
                    href={`/stream/${encodeURIComponent(movie.name)}`}
                    className="group"
                  >
                    <div className="aspect-[16/9] relative rounded-md overflow-hidden">
                      <img
                        src={movie.thumbnail}
                        alt={movie.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-2 text-sm">{movie.name}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <>
              {recentlyWatched.length > 0 && (
                <MovieRowContinue
                  title="Trending"
                  movies={recentlyWatched}
                  isDarkMode={false}
                />
              )}
              <div className="w-full mx-auto flex justify-center items-center">
                <MovieRow
                  title="Explore All"
                  movies={movies}
                  isDarkMode={false}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

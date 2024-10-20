import MovieList from "./components/MovieList";

export default function Home() {
  return (
    <main className="bg-[#fdfdfd] w-full h-full min-h-screen">
      <div className="text-black mx-auto px-4 py-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-light">SOYO </h1>
          
        </header>
        <MovieList  />
      </div>
    </main>
  )
}
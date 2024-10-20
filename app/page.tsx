import MovieList from "./components/MovieList";

export default function Home() {
  return (
    <main className="bg-[#fdfdfd] w-full h-full min-h-screen">
    {/* <nav>
     <h1 className="text-xl text-black">SOYO</h1>
    </nav> */}
    <MovieList/>
    </main>
  )
}
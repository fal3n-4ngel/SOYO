'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import MovieListBox from './MovieListBox'

interface Movie {
  name: string;
  thumbnail: string;
}

export default function MovieList() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/movies')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch movies')
        return res.json()
      })
      .then(data => setMovies(data))
      .catch(err => setError(err.message))
  }, [])

  if (error) return <div className="text-red-500 text-center mt-10">{error}</div>

  return (
    <div className="w-full max-w-7xl mx-auto">
     
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {movies.map(movie => (
          <Link key={movie.name} href={`/stream/${encodeURIComponent(movie.name)}`}>
            <MovieListBox name={movie.name} thumbnail={movie.thumbnail} />
          </Link>
        ))}
      </div>
    </div>
  )
}

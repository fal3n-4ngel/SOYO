'use client'

export default function VideoPlayer({ movie }: { movie: string }) {
  return (
    <div className="aspect-w-16 aspect-h-9">
      <video controls className="w-full h-full object-contain bg-black max-h-[80vh]">
        <source src={`/api/stream/${encodeURIComponent(movie)}`} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
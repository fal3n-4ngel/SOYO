
import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

import { Readable } from 'stream'


const MOVIE_DIR = process.env.MOVIE_DIR || 'F:/'; // Default to 'F:/' if not set

export async function GET(
  request: NextRequest,
  { params }: { params: { movie: string } }
) {

  const { movie } = params
  const filePath = path.join(MOVIE_DIR, decodeURIComponent(movie))

  const stat = fs.statSync(filePath)
  const fileSize = stat.size
  const range = request.headers.get('range')

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
    const chunksize = (end - start) + 1
    const file = fs.createReadStream(filePath, { start, end })
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize.toString(),
      'Content-Type': 'video/mp4',
    }
    return new NextResponse(Readable.toWeb(file) as ReadableStream, { status: 206, headers: head })
  } else {
    const head = {
      'Content-Length': fileSize.toString(),
      'Content-Type': 'video/mp4',
    }
    const file = fs.createReadStream(filePath)
    return new NextResponse(Readable.toWeb(file) as ReadableStream, { status: 200, headers: head })
  }
}
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Any image whose name starts with "landing" — covers "landing_bg_1.jpg",
// "landing_image (1).jpg", "landing-hero-2.png", whatever naming a future
// drop uses, without needing a code change to match it.
const PATTERN = /^landing[^.]*\.(jpe?g|png|webp)$/i;
const NUMBER_IN_NAME = /(\d+)/;

/**
 * Lists the decorative hero images dropped into /public. Sourced from disk so
 * adding more files just works — drop one in, refresh, it's in rotation.
 */
export async function GET() {
  const publicDir = path.join(process.cwd(), "public");

  let files: string[] = [];
  try {
    files = fs.readdirSync(publicDir);
  } catch {
    return NextResponse.json({ images: [] });
  }

  const images = files
    .filter((name) => PATTERN.test(name))
    .sort((a, b) => {
      // Numbered files ("...(1)", "..._2") keep a stable, predictable order;
      // anything without a number sorts after, alphabetically among itself.
      const numA = NUMBER_IN_NAME.exec(a);
      const numB = NUMBER_IN_NAME.exec(b);
      if (numA && numB) return Number(numA[1]) - Number(numB[1]);
      if (numA) return -1;
      if (numB) return 1;
      return a.localeCompare(b);
    })
    .map((name) => `/${name}`);

  return NextResponse.json({ images });
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Answers CORS preflights for the API and, when SOYO_LOG_REQUESTS=1, logs which
 * device is hitting the server. The old unconditional log printed a line for
 * every asset and every video chunk, which made the dev output unusable.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`.
 */
export default function proxy(request: NextRequest) {
  if (request.method === "OPTIONS" && request.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
        "Access-Control-Allow-Headers": "Content-Type, Range",
      },
    });
  }

  if (process.env.SOYO_LOG_REQUESTS === "1") {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    console.log(`[soyo] ${ip} → ${request.method} ${request.nextUrl.pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSettings, verifyPin } from "@/app/lib/db";
import { UNLOCK_COOKIE, UNLOCK_MAX_AGE } from "@/app/lib/session";

export const dynamic = "force-dynamic";

const COOKIE = UNLOCK_COOKIE;
const MAX_AGE = UNLOCK_MAX_AGE;

/** Slows down brute-forcing a 4-digit PIN over the LAN. */
const attempts = new Map<string, { count: number; blockedUntil: number }>();

function clientKey(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export async function POST(request: NextRequest) {
  try {
    const { action, pin } = await request.json();
    const cookieStore = await cookies();

    if (action === "lock") {
      cookieStore.delete(COOKIE);
      return NextResponse.json({ success: true, isUnlocked: false });
    }

    if (action === "unlock") {
      if (!getSettings().pin) {
        return NextResponse.json(
          { error: "No PIN is set. Add one in Settings → Security." },
          { status: 400 }
        );
      }

      const key = clientKey(request);
      const record = attempts.get(key) ?? { count: 0, blockedUntil: 0 };

      if (record.blockedUntil > Date.now()) {
        const seconds = Math.ceil((record.blockedUntil - Date.now()) / 1000);
        return NextResponse.json(
          { error: `Too many attempts. Try again in ${seconds}s.` },
          { status: 429 }
        );
      }

      if (!verifyPin(String(pin ?? ""))) {
        record.count += 1;
        if (record.count >= 5) {
          record.blockedUntil = Date.now() + 60_000;
          record.count = 0;
        }
        attempts.set(key, record);
        return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
      }

      attempts.delete(key);
      cookieStore.set(COOKIE, "true", {
        maxAge: MAX_AGE,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return NextResponse.json({ success: true, isUnlocked: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Auth request failed" }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = await cookies();
  return NextResponse.json({
    hasPinSetup: getSettings().pin !== null,
    isUnlocked: cookieStore.has(COOKIE),
  });
}

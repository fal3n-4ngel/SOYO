import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getSettings, saveSettings, hashPin, verifyPin, DEFAULT_SETTINGS, type Settings } from "@/app/lib/db";
import { scanLibrary } from "@/app/lib/serverUtils";

export const dynamic = "force-dynamic";

/** Never leak the PIN hash to the client. */
function publicSettings(settings: Settings) {
  const { pin, ...rest } = settings;
  return { ...rest, hasPin: pin !== null };
}

export async function GET() {
  const settings = getSettings();

  return NextResponse.json({
    settings: publicSettings(settings),
    defaults: publicSettings(DEFAULT_SETTINGS),
    mediaDirStatus: settings.mediaDirs.map((dir) => ({
      path: dir,
      exists: fs.existsSync(dir),
    })),
  });
}

const NUMERIC_BOUNDS: Record<string, [number, number]> = {
  defaultVolume: [0, 1],
  seekStep: [1, 120],
  completedThreshold: [0.5, 1],
  thumbnailTimemark: [1, 95],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const patch: Partial<Settings> = {};
    let rescan = false;

    // --- media directories -------------------------------------------------
    if (Array.isArray(body.mediaDirs)) {
      const dirs: string[] = (body.mediaDirs as unknown[])
        .filter((d): d is string => typeof d === "string" && d.trim().length > 0)
        .map((d) => d.trim());

      const missing = dirs.filter((d) => !fs.existsSync(d));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `These folders do not exist: ${missing.join(", ")}` },
          { status: 400 }
        );
      }

      patch.mediaDirs = [...new Set(dirs)];
      rescan = true;
    }

    // --- library -----------------------------------------------------------
    if (Array.isArray(body.extensions)) {
      patch.extensions = (body.extensions as unknown[])
        .filter((e): e is string => typeof e === "string")
        .map((e) => (e.startsWith(".") ? e : `.${e}`).toLowerCase());
      rescan = true;
    }

    if (Array.isArray(body.privateFolders)) {
      patch.privateFolders = (body.privateFolders as unknown[])
        .filter((f): f is string => typeof f === "string")
        .map((f) => f.trim())
        .filter(Boolean);
      rescan = true;
    }

    // --- PIN ---------------------------------------------------------------
    if (typeof body.pin === "string") {
      const next = body.pin.trim();

      if (next === "") {
        // Removing an existing PIN requires proving you know it.
        if (getSettings().pin && !verifyPin(String(body.currentPin ?? ""))) {
          return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
        }
        patch.pin = null;
      } else {
        if (!/^\d{4,8}$/.test(next)) {
          return NextResponse.json({ error: "PIN must be 4–8 digits" }, { status: 400 });
        }
        if (getSettings().pin && !verifyPin(String(body.currentPin ?? ""))) {
          return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
        }
        patch.pin = hashPin(next);
      }
    }

    // --- simple scalars ----------------------------------------------------
    const booleans = [
      "autoplay", "autoplayNext", "rememberPosition",
      "thumbnailsEnabled", "hoverPreview", "externalArtwork", "scanOnStart",
    ] as const;
    for (const key of booleans) {
      if (typeof body[key] === "boolean") (patch as Record<string, unknown>)[key] = body[key];
    }

    for (const [key, [min, max]] of Object.entries(NUMERIC_BOUNDS)) {
      if (typeof body[key] === "number" && Number.isFinite(body[key])) {
        (patch as Record<string, unknown>)[key] = Math.min(max, Math.max(min, body[key]));
      }
    }

    const enums: Record<string, readonly string[]> = {
      theme: ["light", "dark", "system"],
      defaultSort: ["name", "added", "size", "recent"],
      defaultView: ["grid", "list"],
      transcode: ["auto", "always", "never"],
      transcodeQuality: ["low", "medium", "high"],
    };
    for (const [key, allowed] of Object.entries(enums)) {
      if (typeof body[key] === "string" && allowed.includes(body[key])) {
        (patch as Record<string, unknown>)[key] = body[key];
      }
    }

    if (typeof body.accent === "string" && /^#[0-9a-f]{6}$/i.test(body.accent)) {
      patch.accent = body.accent;
    }

    const settings = saveSettings(patch);

    // Directory, extension and privacy changes invalidate the cached index.
    if (rescan) void scanLibrary();

    return NextResponse.json({ success: true, settings: publicSettings(settings), rescan });
  } catch (error) {
    console.error("[soyo] Failed to save settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);

/**
 * Directory browser backing the media-folder picker in Settings.
 *
 * It lists directory *names* only — never file contents — so the config page can
 * navigate to a media root without anyone typing an absolute path. Soyo is a
 * LAN server for your own machine; if you expose it beyond that, set a PIN.
 */

async function listDrives(): Promise<string[]> {
  if (process.platform !== "win32") {
    // On Linux / Docker, list all non-system top-level directories in / as root drives
    const SYSTEM_DIRS = new Set([
      "bin", "boot", "dev", "etc", "lib", "lib64", "opt",
      "proc", "root", "run", "sbin", "srv", "sys", "tmp", "usr", "var", "app"
    ]);

    try {
      const rootEntries = fs.readdirSync("/", { withFileTypes: true });
      const userVolumes = rootEntries
        .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !SYSTEM_DIRS.has(d.name.toLowerCase()))
        .map((d) => `/${d.name}`);

      if (userVolumes.length > 0) return userVolumes;
    } catch {
      /* fallback */
    }
    return ["/"];
  }

  try {
    const { stdout } = await execFileAsync("wmic", ["logicaldisk", "get", "name"], {
      windowsHide: true,
    });
    const drives = stdout
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^[A-Za-z]:$/.test(l))
      .map((l) => `${l}\\`);
    if (drives.length > 0) return drives;
  } catch {
    /* wmic is deprecated on newer Windows builds — fall through */
  }

  // Probe A: through Z: directly.
  const found: string[] = [];
  for (let i = 65; i <= 90; i++) {
    const drive = `${String.fromCharCode(i)}:\\`;
    try {
      if (fs.existsSync(drive)) found.push(drive);
    } catch {
      /* not mounted */
    }
  }
  return found;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("path");

  try {
    // No path: hand back drive roots and a few useful shortcuts.
    if (!target || target === "root") {
      const drives = await listDrives();
      const home = os.homedir();
      // Paths here are user-chosen by design; the tracer can't scope them, and
      // Soyo is self-hosted rather than bundled for a serverless target.
      const shortcuts = ["Videos", "Movies", "Downloads", "Desktop"]
        .map((name) => path.join(/* turbopackIgnore: true */ home, name))
        .filter((p) => fs.existsSync(p));

      return NextResponse.json({
        path: null,
        parent: null,
        drives,
        shortcuts,
        entries: drives.map((d) => ({ name: d, path: d, hasChildren: true })),
      });
    }

    const resolved = path.resolve(target);
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Not a directory" }, { status: 400 });
    }

    const dirents = fs.readdirSync(resolved, { withFileTypes: true });

    const entries = dirents
      .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("$"))
      .map((d) => {
        const full = path.join(resolved, d.name);
        let hasChildren = false;
        try {
          hasChildren = fs.readdirSync(full, { withFileTypes: true }).some((c) => c.isDirectory());
        } catch {
          /* permission denied — treat as leaf */
        }
        return { name: d.name, path: full, hasChildren };
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const mediaCount = dirents.filter(
      (d) => d.isFile() && /\.(mp4|mkv|webm|avi|mov|m4v|ogg|wmv|flv)$/i.test(d.name)
    ).length;

    const parent = path.dirname(resolved);

    return NextResponse.json({
      path: resolved,
      parent: parent === resolved ? null : parent,
      entries,
      mediaCount,
      drives: await listDrives(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cannot read directory";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

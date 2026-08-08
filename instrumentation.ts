/**
 * Next compiles this file for every runtime, so anything touching Node APIs has
 * to stay behind a dynamic import — otherwise the Edge bundle trips on
 * `process.once`, `dgram`, and friends.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (process.env.SOYO_DISABLE_MDNS !== "1") {
    const { startMdns } = await import("@/app/lib/mdns");
    await startMdns();
  }

  const { getSettings } = await import("@/app/lib/db");
  if (getSettings().scanOnStart) {
    const { scanLibrary } = await import("@/app/lib/serverUtils");
    // Deliberately not awaited — the server should accept requests immediately
    // and serve the previous index while the rescan runs.
    void scanLibrary()
      .then((movies) => console.log(`[soyo] Startup scan indexed ${movies.length} titles`))
      .catch((err) => console.error("[soyo] Startup scan failed:", err));
  }
}

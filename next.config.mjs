import os from "os";

/**
 * Next dev refuses cross-origin requests for /_next/* assets unless the origin is
 * allow-listed. Without this the page loads on a phone but every script and
 * stylesheet 403s, which looks exactly like "the site is broken on other devices".
 */
function lanOrigins() {
  const origins = new Set(["localhost", "127.0.0.1", "soyo.local", `${os.hostname()}.local`, os.hostname()]);

  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const addr of addrs ?? []) {
      const isV4 = addr.family === "IPv4" || addr.family === 4;
      if (isV4 && !addr.internal) origins.add(addr.address);
    }
  }

  return [...origins];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow any private-range host during dev, plus the concrete addresses we found.
  allowedDevOrigins: [...lanOrigins(), "192.168.*.*", "10.*.*.*", "172.16.*.*", "*.local"],

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Range" },
          { key: "Access-Control-Expose-Headers", value: "Content-Range, Accept-Ranges, Content-Length" },
        ],
      },
    ];
  },

  serverExternalPackages: ["bonjour-service", "fluent-ffmpeg", "webtorrent"],
};

export default nextConfig;

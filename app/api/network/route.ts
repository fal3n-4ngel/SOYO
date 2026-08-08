import { NextRequest, NextResponse } from "next/server";
import net from "net";
import { getNetworkInfo } from "@/app/lib/network";

export const dynamic = "force-dynamic";

/**
 * Connects to our own LAN address to prove the server is bound to 0.0.0.0 and
 * not just loopback. A failure here means other devices cannot connect either,
 * which is the difference between "wrong URL" and "wrong bind address".
 */
function probeSelf(host: string, port: number, timeout = 1200): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

export async function GET(request: NextRequest) {
  const info = getNetworkInfo();

  const boundToLan = info.primary ? await probeSelf(info.primary, info.port) : false;

  const requestHost = request.headers.get("host");
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",")[0].trim() || request.headers.get("x-real-ip") || null;
  const isRemoteClient = Boolean(
    clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1" && clientIp !== "::ffff:127.0.0.1"
  );

  const hints: string[] = [];
  if (!info.primary) {
    hints.push("No LAN address detected. Connect this machine to Wi-Fi or Ethernet.");
  } else if (!boundToLan) {
    hints.push(
      `The server is not listening on ${info.primary}:${info.port}. Start it with "next dev -H 0.0.0.0" so it binds to every interface.`
    );
  }
  if (info.candidates.some((c) => c.virtual)) {
    hints.push(
      "Virtual adapters (WSL/Hyper-V/VPN) are present. Use the address marked primary — the others are not reachable from your phone."
    );
  }
  if (process.platform === "win32") {
    hints.push(
      "If a phone still times out, Windows Firewall is blocking Node. Run: npm run allow-firewall (as administrator)."
    );
  }
  hints.push("Android and Chrome do not resolve .local names — scan the QR code or use the LAN address.");

  return NextResponse.json({
    ...info,
    // Kept for backwards compatibility with the old shape.
    ip: info.primary ?? "127.0.0.1",
    diagnostics: {
      boundToLan,
      requestHost,
      clientIp,
      isRemoteClient,
      platform: process.platform,
      hints,
    },
  });
}

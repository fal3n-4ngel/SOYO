import os from "os";
import dgram from "dgram";

export interface NetAddress {
  address: string;
  iface: string;
  netmask: string;
  cidr: string | null;
  /** Lower is better. Used to pick the address other devices can actually reach. */
  score: number;
  virtual: boolean;
}

export interface NetworkInfo {
  /** The address other devices on the LAN should use. */
  primary: string | null;
  /** Every IPv4 candidate, best first. */
  candidates: NetAddress[];
  hostname: string;
  mdnsHost: string;
  port: number;
  urls: {
    lan: string | null;
    mdns: string;
    local: string;
  };
}

/**
 * Adapter names that belong to VMs, containers, or overlay VPNs. Their addresses
 * are routable from this machine but not from a phone on the same Wi-Fi, so they
 * must never win the "primary" slot.
 */
const VIRTUAL_IFACE = /(vethernet|virtualbox|vmware|hyper-v|docker|wsl|loopback|tailscale|zerotier|tap-|tun-|npcap|bluetooth|vpn|nordlynx|wg\d|utun)/i;

function isPrivate(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p[0] === 10) return true;
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
  if (p[0] === 192 && p[1] === 168) return true;
  return false;
}

function isLinkLocal(ip: string): boolean {
  return ip.startsWith("169.254.");
}

/**
 * Ranks an address by how likely another device on the same Wi-Fi can reach it.
 * 192.168.x is the typical home LAN, 10.x is common on larger/managed networks,
 * 172.16-31.x is heavily used by Docker/WSL so it ranks last among private ranges.
 */
function scoreAddress(address: string, iface: string): { score: number; virtual: boolean } {
  const virtual = VIRTUAL_IFACE.test(iface);
  let score = 0;

  if (virtual) score += 100;
  if (isLinkLocal(address)) score += 500;
  if (!isPrivate(address)) score += 50;

  if (address.startsWith("192.168.")) score += 0;
  else if (address.startsWith("10.")) score += 5;
  else if (address.startsWith("172.")) score += 20;

  // Prefer real NIC names on Windows/macOS/Linux.
  if (/^(wi-?fi|wlan|en\d|eth\d|wlp|enp|ethernet)/i.test(iface)) score -= 10;

  return { score, virtual };
}

export function listAddresses(): NetAddress[] {
  const ifaces = os.networkInterfaces();
  const out: NetAddress[] = [];

  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs ?? []) {
      // Node <18 reports family as string, >=18 as number in some builds.
      const isV4 = addr.family === "IPv4" || (addr.family as unknown as number) === 4;
      if (!isV4 || addr.internal) continue;

      const { score, virtual } = scoreAddress(addr.address, name);
      out.push({
        address: addr.address,
        iface: name,
        netmask: addr.netmask,
        cidr: addr.cidr ?? null,
        score,
        virtual,
      });
    }
  }

  return out.sort((a, b) => a.score - b.score);
}

/**
 * Asks the OS routing table which local address it would use to reach the
 * outside world. This is the single most reliable way to find the NIC that is
 * actually attached to the LAN — no packet is sent, the UDP socket is only
 * "connected" so the kernel picks a source address.
 */
function routedAddress(): string | null {
  try {
    const socket = dgram.createSocket("udp4");
    socket.unref();
    let address: string | null = null;
    try {
      socket.connect(53, "8.8.8.8");
      address = socket.address().address;
    } catch {
      address = null;
    }
    socket.close();
    if (address && address !== "0.0.0.0" && !isLinkLocal(address)) return address;
  } catch {
    /* falls through to interface scan */
  }
  return null;
}

let cachedRouted: string | null | undefined;

export function getPrimaryAddress(): string | null {
  const candidates = listAddresses();
  if (candidates.length === 0) return null;

  if (cachedRouted === undefined) cachedRouted = routedAddress();

  // Trust the routing table, but only if that address is a real (non-virtual) NIC.
  if (cachedRouted) {
    const match = candidates.find((c) => c.address === cachedRouted);
    if (match && !match.virtual) return match.address;
  }

  return candidates[0].address;
}

/** The port the HTTP server is listening on, however it was started. */
export function getPort(): number {
  const fromEnv = process.env.PORT ?? process.env.SOYO_PORT;
  if (fromEnv && !Number.isNaN(Number(fromEnv))) return Number(fromEnv);

  const argv = process.argv;
  const flag = argv.findIndex((a) => a === "-p" || a === "--port");
  if (flag !== -1 && argv[flag + 1]) {
    const parsed = Number(argv[flag + 1]);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return 3000;
}

export const MDNS_HOST = process.env.SOYO_MDNS_HOST || "soyo.local";

export function getNetworkInfo(): NetworkInfo {
  const port = getPort();
  const primary = getPrimaryAddress();
  const suffix = port === 80 ? "" : `:${port}`;

  return {
    primary,
    candidates: listAddresses(),
    hostname: os.hostname(),
    mdnsHost: MDNS_HOST,
    port,
    urls: {
      lan: primary ? `http://${primary}${suffix}` : null,
      mdns: `http://${MDNS_HOST}${suffix}`,
      local: `http://localhost${suffix}`,
    },
  };
}

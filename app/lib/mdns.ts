import { getPrimaryAddress, getPort, MDNS_HOST } from "./network";

/**
 * Advertises the server on the local network over mDNS/Bonjour so it can be
 * reached at http://soyo.local:<port> from phones, tablets and TVs.
 *
 * bonjour-service's default behaviour publishes an A record for *every*
 * non-internal interface (plus IPv6 link-local AAAA records). On a machine with
 * Hyper-V, WSL, VirtualBox or a VPN adapter, clients happily resolve soyo.local
 * to an address they cannot route to and the site appears dead. We therefore
 * replace the record set with a single A record pointing at the real LAN NIC.
 *
 * This module is Node-only and must stay behind a dynamic import in
 * instrumentation.ts — Next compiles that file for the Edge runtime too.
 */
export async function startMdns(): Promise<void> {
  const port = getPort();
  const address = getPrimaryAddress();

  if (!address) {
    console.warn(
      "[soyo] No LAN address found — skipping mDNS. Connect to Wi-Fi or Ethernet and restart."
    );
    return;
  }

  try {
    const { Bonjour } = await import("bonjour-service");
    const bonjour = new Bonjour();

    const service = bonjour.publish({
      name: "soyo",
      type: "http",
      protocol: "tcp",
      port,
      host: MDNS_HOST,
      disableIPv6: true,
      txt: { service: "Soyo Media Server", path: "/" },
    });

    // Replace the auto-generated address records with one that is actually
    // reachable. publish() only announces behind an async probe timer, so this
    // instance-level override lands before anything is sent on the wire.
    const originalRecords = service.records.bind(service);
    service.records = () => {
      const records = originalRecords().filter(
        (r: { type: string }) => r.type !== "A" && r.type !== "AAAA"
      );
      records.push({ name: MDNS_HOST, type: "A", ttl: 120, data: address });
      return records;
    };

    const shutdown = () => {
      try {
        bonjour.unpublishAll(() => bonjour.destroy());
      } catch {
        /* process is going away anyway */
      }
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    process.once("beforeExit", shutdown);

    console.log(
      [
        "",
        "  \x1b[1msoyo\x1b[0m is on your network",
        "",
        `  \x1b[36m➜\x1b[0m  LAN:      http://${address}:${port}`,
        `  \x1b[36m➜\x1b[0m  mDNS:     http://${MDNS_HOST}:${port}`,
        `  \x1b[36m➜\x1b[0m  Local:    http://localhost:${port}`,
        "",
        "  Phones/Android may not resolve .local — use the LAN address or scan",
        "  the QR code on the home page.",
        "",
      ].join("\n")
    );
  } catch (err) {
    console.error(
      "[soyo] mDNS failed to start (the LAN IP still works):",
      err instanceof Error ? err.message : err
    );
  }
}

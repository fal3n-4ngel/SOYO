import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getNetworkInfo } from "@/app/lib/network";

export const dynamic = "force-dynamic";

/**
 * Renders a QR code for the server's LAN URL so a phone can join without
 * anyone typing an IP address. Defaults to the primary LAN URL; `?url=` and
 * `?dark=` let the config page render alternatives and match the theme.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const info = getNetworkInfo();

  const target = searchParams.get("url") || info.urls.lan || info.urls.local;
  const dark = searchParams.get("dark") === "1";

  try {
    const svg = await QRCode.toString(target, {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: dark ? "#f5f5f5" : "#000000",
        light: "#00000000",
      },
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to render QR code" }, { status: 500 });
  }
}

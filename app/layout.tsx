import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import ThemeScript from "./components/ThemeScript";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  weight: ["500", "600", "700"],
  display: "swap",
});
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: "SOYO — Stream On Your Own",
  description:
    "Stream your local media library to any device on your Wi-Fi. No cloud, no account, no upload.",
  applicationName: "Soyo",
  appleWebApp: { capable: true, title: "Soyo", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${inter.variable} ${jbMono.variable} ${outfit.variable} font-sans antialiased`}>
        {/* Brand strip — a quiet constant across every page, adapts with the theme. */}
        <div aria-hidden className="fixed inset-x-0 top-0 z-[70] h-[3px] bg-fg" />
        {children}
      </body>
    </html>
  );
}

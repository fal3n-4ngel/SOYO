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
  title: {
    default: "SOYO — Stream On Your Own",
    template: "%s | SOYO",
  },
  description:
    "Stream your local media library to any device on your Wi-Fi. No cloud, no account, no upload. Privacy-first, ultrafast local media server.",
  applicationName: "SOYO",
  keywords: ["SOYO", "media server", "local streaming", "home streaming", "privacy-first media server", "self-hosted", "Next.js media server"],
  authors: [{ name: "fal3n-4ngel", url: "https://github.com/fal3n-4ngel" }],
  creator: "fal3n-4ngel",
  publisher: "SOYO",
  metadataBase: new URL("https://github.com/fal3n-4ngel/SOYO"),
  openGraph: {
    title: "SOYO — Stream On Your Own",
    description: "Stream your local media library to any device on your Wi-Fi. No cloud, no account, no upload.",
    url: "https://github.com/fal3n-4ngel/SOYO",
    siteName: "SOYO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SOYO — Stream On Your Own",
    description: "Stream your local media library to any device on your Wi-Fi. No cloud, no account, no upload.",
  },
  appleWebApp: { capable: true, title: "SOYO", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
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

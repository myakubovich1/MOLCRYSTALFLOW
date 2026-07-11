import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { getThemeInitializationScript } from "@/lib/theme";

import "./globals.css";

const sfSans = localFont({
  src: "./fonts/SFNS.ttf",
  variable: "--font-sans",
});

const sfMono = localFont({
  src: "./fonts/SFNSMono.ttf",
  variable: "--font-mono",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MolCrystalFlow",
    template: "%s | MolCrystalFlow",
  },
  description: "Generate candidate crystal packings from a molecular conformer. Download results in XYZ format with interactive 3D previews.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "MolCrystalFlow",
    description: "Generate candidate crystal packings from a molecular conformer with interactive 3D previews.",
    images: [
      {
        url: "/brand/MCF_OpenGraph_1200x630.jpg",
        width: 1200,
        height: 630,
        alt: "MolCrystalFlow",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MolCrystalFlow",
    description: "Generate candidate crystal packings from a molecular conformer with interactive 3D previews.",
    images: ["/brand/MCF_OpenGraph_1200x630.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sfSans.variable} ${sfMono.variable}`}
      suppressHydrationWarning
      data-theme="dark"
      data-theme-preference="system"
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: getThemeInitializationScript() }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

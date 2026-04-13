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

export const metadata: Metadata = {
  title: {
    default: "MolCrystalFlow",
    template: "%s | MolCrystalFlow",
  },
  description: "Generate candidate crystal packings from a molecular conformer. Download results in XYZ format with interactive 3D previews.",
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

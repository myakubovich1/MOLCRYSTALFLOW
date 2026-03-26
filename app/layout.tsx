import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

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
    default: "MolCrystalFlow Demo",
    template: "%s | MolCrystalFlow Demo",
  },
  description: "Mock-first molecular crystal generation workflow prototype for `.xyz` conformer upload and candidate preview.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${sfSans.variable} ${sfMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

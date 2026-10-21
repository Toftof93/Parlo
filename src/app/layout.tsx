import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./globals.css";
import { Mark } from "@/components/Mark";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://useparlo.xyz";
const description = "Describe a smart contract in plain English. Parlo writes it, explains every line, compiles it and helps you deploy it to Robinhood Chain.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Parlo · Speak your contract into existence",
  description,
  openGraph: { title: "Parlo", description, siteName: "Parlo" },
  twitter: { card: "summary_large_image", title: "Parlo", description },
};

export const viewport: Viewport = { themeColor: "#f4f1ea", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <header className="top">
          <a href="/" className="brand">
            <Mark />
            <span>Parlo</span>
          </a>
          <nav>
            <a href="/#how">How it works</a>
            <a href="/studio" className="btn small primary">
              Open studio
            </a>
          </nav>
        </header>
        {children}
        <footer className="foot">
          <span>Parlo · Speak your contract into existence.</span>
          <span>AI-written code isn’t audited. Review and test before using real funds.</span>
        </footer>
      </body>
    </html>
  );
}

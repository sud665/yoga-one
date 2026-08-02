import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { OfflineBanner } from "./offline-banner";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

// DESIGN.md typography: Bebas Neue (display-hero, login/onboarding
// headlines only) + Inter (everything else) -- replaces the
// create-next-app scaffold's Geist/Geist Mono, which DESIGN.md never
// specified. Grepped every `font-geist-sans`/`font-geist-mono`/`font-sans`/
// `font-mono` usage across the app before removing them:
// --font-geist-sans only ever fed globals.css's `--font-sans` alias (used
// once, by app/page.tsx's `font-sans` class) -- now Inter instead.
// --font-geist-mono only ever fed `--font-mono` (used once, the invite-code
// <span> in app/admin/invites/page.tsx) -- left undefined in globals.css so
// Tailwind's own default monospace stack applies; not worth loading a
// second webfont for one short code string.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Bebas Neue ships one static weight (400) -- see the
// --text-display-hero--font-weight comment in globals.css for why that's
// used instead of DESIGN.md's literal 500.
const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "요가원 관리",
  description: "요가원 강사·클래스·회원 관리 PWA",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${bebasNeue.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <OfflineBanner />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

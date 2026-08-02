import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { OfflineBanner } from "./offline-banner";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

// DESIGN.md typography (retoken pass): Inter only, for every size including
// display-lg -- the Bebas Neue display face the previous DESIGN.md
// specified for login/onboarding headlines is gone. Grepped every
// `Bebas`/`display-hero`/`font-display` usage across the app first: the
// only match anywhere was this file's own font load, so dropping it has no
// other call site to fix (auth pages never rendered a `display-hero`
// className -- that pass documented them as out of scope, and this pass's
// auth sweep uses `text-display-lg` directly instead).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "요가원 관리",
  description: "요가원 강사·클래스·회원 관리 PWA",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  // Matches --color-brand-deep and public/manifest.json's theme_color: this
  // tints the browser/OS chrome around an installed PWA, so all three have
  // to agree or the app frame and the app disagree on what color it is.
  themeColor: "#4f6d55",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} h-full antialiased`}>

      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <OfflineBanner />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

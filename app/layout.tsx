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
      <body className="h-full bg-surface-strong">
        {/* App-shell frame, not a responsive website: capped at a phone
            width and centered, rather than reflowing to fill a wide desktop
            viewport. `overflow-hidden` + `flex-col` here (not scrollable
            itself) is what makes a bottom nav bar stay visually pinned
            while the content beneath it scrolls -- every role layout's
            <main> handles its own `flex-1 overflow-y-auto`, and its nav sits
            outside that scrolling region as an ordinary shrink-0 flex
            sibling instead of `position: fixed`, which would escape this
            frame entirely and snap to the real browser viewport on a wide
            desktop window. bg-surface-strong on <body> (the desktop
            backdrop) vs. bg-canvas on the frame keeps the frame reading as
            a distinct device against its surroundings past max-w-md. */}
        <div className="relative mx-auto flex h-full w-full max-w-md flex-col overflow-hidden bg-canvas md:shadow-xl">
          <ToastProvider>
            <OfflineBanner />
            {/* overflow-y-auto here is a fallback default, not the primary
                scroll mechanism: a role layout's own <main> handles its own
                internal scrolling (nav stays put, content scrolls), so this
                outer region never actually needs to scroll on those pages --
                it only matters for a page with no nav shell at all (the
                centered auth screens), whose content can still legitimately
                exceed the frame's height on a short viewport. */}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}

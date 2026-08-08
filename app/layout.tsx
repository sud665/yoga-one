import type { Metadata, Viewport } from "next";
import { Gowun_Batang } from "next/font/google";
import localFont from "next/font/local";
import { OfflineBanner } from "./offline-banner";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

// DESIGN.md typography ("Classical" pass): Inter is gone -- it has no
// Hangul glyphs at all, so every Korean character in this app has always
// silently fallen back past it to the OS default font. Pretendard Variable
// (self-hosted via the `pretendard` npm package, not the CDN link the
// Claude Design source used -- self-hosting avoids an external request this
// app's offline-first PWA shell shouldn't depend on) replaces it as the one
// sans face for everything. Gowun Batang is new: a serif loaded at weight
// 400 only (the design source's own CSS requests 400+700 but never
// references 700 anywhere in its markup -- confirmed by grep) for the
// handful of auth-shell display headlines that use `text-headline-lg`/
// `text-headline-md` (see app/globals.css's Typography block).
const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "45 920",
});

const gowunBatang = Gowun_Batang({
  variable: "--font-gowun-batang",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
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
  themeColor: "#1f3a2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${pretendard.variable} ${gowunBatang.variable} h-full antialiased`}
    >
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

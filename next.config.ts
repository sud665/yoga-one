import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Serwist defaults this to `true`, injecting its own `window`
  // `online`-event listener that force-reloads the page. That fights the
  // app's own OfflineBanner (app/offline-banner.tsx), which already
  // handles the online/offline transition without a hard reload.
  reloadOnOnline: false,
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);

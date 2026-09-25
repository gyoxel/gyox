import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep pages in the browser's client cache so switching tabs is instant
    // instead of waiting on a server render each time. Every mutation calls
    // the invalidateAll() Server Function, which purges this cache, so these
    // are upper bounds for data changed elsewhere (e.g. another device).
    staleTimes: {
      // Pages fully prefetched (prefetch={true}) — the bottom-bar tabs etc.
      static: 900,
      // Pages visited without a full prefetch.
      dynamic: 300,
    },
  },
};

export default nextConfig;

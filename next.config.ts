import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // File watching misses edits on NTFS disks (stylesheets stay stale in dev); poll in dev only.
  ...(process.env.NODE_ENV === "production" ? {} : { watchOptions: { pollIntervalMs: 1500 } }),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

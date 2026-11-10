import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build autosufficiente (.next/standalone): è ciò che gira nell'immagine Docker.
  output: "standalone",
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

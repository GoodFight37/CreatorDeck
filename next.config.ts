import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    formats: ["image/webp"],
    qualities: [75, 82, 88],
    deviceSizes: [300],
    imageSizes: [150, 200, 300],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
};

export default nextConfig;

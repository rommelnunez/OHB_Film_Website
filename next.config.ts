import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve static index.html for the root route
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/index.html',
      },
    ];
  },
};

export default nextConfig;

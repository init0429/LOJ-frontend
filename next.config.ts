import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://64.110.116.177:8000/:path*",
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${(process.env.BACKEND_API_URL || "http://152.69.207.122").replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

export default nextConfig;

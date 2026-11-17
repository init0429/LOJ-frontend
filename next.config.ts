import type { NextConfig } from "next";

// /api/* 요청을 넘겨줄 백엔드 주소. 개발할 때는 로컬 API를 쓰고, 운영 빌드에서는 반드시
// 지정해야 한다. 서버 주소를 코드에 박아 두면 서버를 옮길 때 조용히 엉뚱한 곳으로 간다.
function backendApiUrl(): string {
  const value = process.env.BACKEND_API_URL?.trim();
  if (value) return value.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_API_URL이 비어 있습니다. frontend/.env에 백엔드 주소를 적은 뒤 다시 빌드하세요 (.env.example 참고).");
  }
  return "http://localhost:8000";
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiUrl()}/:path*`,
      },
    ];
  },
};

export default nextConfig;

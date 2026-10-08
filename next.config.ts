import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() { return [{ source: "/pqc-practice/audit", destination: "/pqc-practice/audit.html" }]; },
};

export default nextConfig;

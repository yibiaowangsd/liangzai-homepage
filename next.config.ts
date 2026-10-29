import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return ["/pqc-practice/interop", "/pqc-practice/interop.html"].map(source => ({
      source,
      destination: "/pqc-practice/index.html",
      permanent: false,
    }));
  },
};

export default nextConfig;

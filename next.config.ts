import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/@:username([A-Za-z0-9_]{3,20})",
        destination: "/:username",
        permanent: true,
      },
      {
        source: "/u/:username([A-Za-z0-9_]{3,20})",
        destination: "/:username",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

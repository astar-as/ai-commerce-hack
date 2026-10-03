import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@moss-js/moss", "@moss-js/moss-core"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.gstatic.com" }],
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const basePath = process.env.GITHUB_ACTIONS ? "/kaspi-insights-web" : "";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;

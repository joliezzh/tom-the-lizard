import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mediapipe/tasks-vision"],
  webpack: (config) => {
    // MediaPipe loads WASM with a variable import(); don't treat that as a hard error.
    config.module.exprContextCritical = false;
    config.module.unknownContextCritical = false;
    return config;
  },
};

export default nextConfig;

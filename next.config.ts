import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // React Compiler 仅在生产环境启用，开发环境关闭以加快编译速度
  reactCompiler: process.env.NODE_ENV === 'production',
};

export default nextConfig;

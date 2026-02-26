// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // 忽略构建时的TypeScript错误
    ignoreBuildErrors: true,
  },
  eslint: {
    // 忽略构建时的ESLint错误
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig

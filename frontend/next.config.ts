import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  experimental: {
    cpus: 1,
    workerThreads: false,
    optimizePackageImports: [
      'lucide-react',
      'clsx',
      'tailwind-merge',
    ],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  headers: async () => [
    {
      source: '/:all*(svg|jpg|png|webp|avif|woff2|woff)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
};

export default nextConfig;

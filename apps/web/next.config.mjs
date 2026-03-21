import { withSentryConfig } from '@sentry/nextjs';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 스크립트/ CSS 경로가 항상 루트 기준(/_next/...)으로 로드되도록 명시 (404 방지)
  basePath: '',
  assetPrefix: '',
  transpilePackages: ['@online-miok/schemas'],
  experimental: {
    // lucide 아이콘 트리쉐이크 — 어드민 레이아웃 등에서 번들·파싱 부담 감소
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.firebasestorage.app', pathname: '/**' },
      // Some Firebase Storage links use this host format.
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'image.aladin.co.kr', pathname: '/**' },
      { protocol: 'http', hostname: 'image.aladin.co.kr', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
  },
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/favicon.svg' }];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      zod: path.resolve(__dirname, 'node_modules/zod'),
    };
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? undefined,
  project: process.env.SENTRY_PROJECT ?? undefined,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});

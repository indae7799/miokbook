import { withSentryConfig } from '@sentry/nextjs';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monoRoot = path.join(__dirname, '..', '..');

/** pnpm 호이스팅·Vercel에서 packages/schemas 가 zod 를 찾도록 */
function resolveZodPackageDir() {
  const candidates = [
    path.join(__dirname, 'node_modules', 'zod'),
    path.join(monoRoot, 'node_modules', 'zod'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
  }
  return path.dirname(require.resolve('zod/package.json', { paths: [__dirname, monoRoot] }));
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 로컬·Vercel 빌드: 미정리 ESLint로 실패하지 않도록 (추후 린트 정리 후 제거 가능)
  eslint: { ignoreDuringBuilds: true },
  // 스크립트/ CSS 경로가 항상 루트 기준(/_next/...)으로 로드되도록 명시 (404 방지)
  basePath: '',
  assetPrefix: '',
  transpilePackages: ['@online-miok/schemas'],
  experimental: {
    // lucide 아이콘 트리쉐이크 — 어드민 레이아웃 등에서 번들·파싱 부담 감소
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.firebasestorage.app', pathname: '/**' },
      // Some Firebase Storage links use this host format.
      { protocol: 'https', hostname: 'storage.googleapis.com', pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },
      { protocol: 'https', hostname: 'image.aladin.co.kr', pathname: '/**' },
      { protocol: 'http', hostname: 'image.aladin.co.kr', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      // Supabase Storage (공개 버킷 URL)
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/**' },
    ],
  },
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/favicon.svg' }];
  },
  webpack: (config) => {
    const zodDir = resolveZodPackageDir();
    config.resolve.alias = {
      ...config.resolve.alias,
      zod: zodDir,
    };
    const extra = [path.join(__dirname, 'node_modules'), path.join(monoRoot, 'node_modules')];
    const existing = config.resolve.modules ?? ['node_modules'];
    config.resolve.modules = [...extra, ...existing.filter((m) => !extra.includes(m))];
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? undefined,
  project: process.env.SENTRY_PROJECT ?? undefined,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});

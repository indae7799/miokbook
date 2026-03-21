'use client';

import Image, { type ImageProps } from 'next/image';
import { cmsImageUnoptimized } from '@/lib/cms-image';

/**
 * 어드민 목록/미리보기용 이미지.
 * - dev: 최적화 파이프가 매 요청마다 돌면 버벅일 수 있어 기본 unoptimized
 * - `/uploads/...`: Vercel 등에서 `/_next/image` 400 방지
 */
export default function AdminPreviewImage(props: ImageProps) {
  const devSkipOptimize = process.env.NODE_ENV === 'development';
  const { alt = '', unoptimized, src, ...rest } = props;
  const srcStr = typeof src === 'string' ? src : '';
  const unopt =
    unoptimized ?? (devSkipOptimize || cmsImageUnoptimized(srcStr));
  return <Image {...rest} src={src} alt={alt} unoptimized={unopt} />;
}

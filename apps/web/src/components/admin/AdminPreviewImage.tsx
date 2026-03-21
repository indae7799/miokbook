'use client';

import Image, { type ImageProps } from 'next/image';
import { cmsImageUnoptimized } from '@/lib/cms-image';

/**
 * 어드민 목록/미리보기용 이미지.
 * - dev: 최적화 생략(반응 속도)
 * - `/uploads/...` (로컬 개발 때 CMS에 남은 경로): Vercel에 파일이 없어 `/_next/image` 가 400 → unoptimized 로 직접 요청(깨지면 해당 배너만 Supabase로 재업로드)
 */
export default function AdminPreviewImage(props: ImageProps) {
  const devSkipOptimize = process.env.NODE_ENV === 'development';
  const { alt = '', unoptimized, src, ...rest } = props;
  const legacyUploadPath = typeof src === 'string' && cmsImageUnoptimized(src);
  return (
    <Image
      {...rest}
      src={src}
      alt={alt}
      unoptimized={unoptimized ?? (devSkipOptimize || legacyUploadPath)}
    />
  );
}

'use client';

import Image, { type ImageProps } from 'next/image';

/**
 * 어드민 목록/미리보기용 이미지.
 * 개발 모드에서 Next 이미지 최적화(리사이즈·WebP) 파이프가 매 요청마다 돌면 스크롤·입력이 버벅일 수 있어
 * dev에서만 unoptimized 로 원본 URL을 직접 로드합니다. 프로덕션은 기본 최적화 유지.
 */
export default function AdminPreviewImage(props: ImageProps) {
  const devSkipOptimize = process.env.NODE_ENV === 'development';
  const { alt = '', unoptimized, ...rest } = props;
  return <Image {...rest} alt={alt} unoptimized={unoptimized ?? devSkipOptimize} />;
}

/**
 * OG·canonical·사이트맵용 절대 URL origin.
 * NEXT_PUBLIC_SITE_URL 우선, 미설정 시 프로덕션 도메인 고정값 사용.
 * VERCEL_URL(배포별 고유 URL)은 사용하지 않음 — 카카오 등 공유 시 잘못된 URL로 연결되기 때문.
 */
export function getSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit).origin;
    } catch {
      /* fall through */
    }
  }
  // 개발 환경
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  // 프로덕션 고정 도메인
  return 'https://miokbook.com';
}

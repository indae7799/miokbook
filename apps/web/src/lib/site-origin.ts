/**
 * OG·canonical·사이트맵용 절대 URL origin.
 *
 * - Safari/카카오 공유 시 `miokbook-xxx-team.vercel.app` 같은 **배포 해시 URL**이 노출되지 않게 하려면
 *   메타의 절대 URL은 `VERCEL_URL`(배포별)이 아니라 **프로덕션 호스트**를 써야 함.
 * - Vercel은 `VERCEL_PROJECT_PRODUCTION_URL`에 `miokbook.vercel.app` 등 안정 호스트를 넣어 줌(문서: System env).
 * - 프리뷰 배포는 공유·OG가 실제 접속 URL과 맞도록 `VERCEL_URL` origin 사용.
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

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  const vercelEnv = process.env.VERCEL_ENV;

  if (vercelEnv === 'production') {
    const prodHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (prodHost) {
      const host = prodHost.replace(/^https?:\/\//, '').split('/')[0];
      if (host) return `https://${host}`;
    }
  }

  if (vercelEnv === 'preview' && process.env.VERCEL_URL?.trim()) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, '').split('/')[0];
    if (host) return `https://${host}`;
  }

  return 'https://miokbook.com';
}

/**
 * 프로덕션에서 주소창·Safari 공유 URL을 고정할 호스트만 반환.
 * `NEXT_PUBLIC_SITE_URL` 또는 Vercel의 `VERCEL_PROJECT_PRODUCTION_URL`이 없으면 null — 잘못된 리다이렉트 방지.
 */
export function getProductionCanonicalHost(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit).host.toLowerCase();
    } catch {
      /* fall through */
    }
  }
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) {
    const host = prod.replace(/^https?:\/\//, '').split('/')[0];
    if (host) return host.toLowerCase();
  }
  return null;
}

/**
 * OG·canonical·사이트맵용 절대 URL origin.
 * NEXT_PUBLIC_SITE_URL 미설정 시 Vercel(VERCEL_URL)을 사용 — 비어 있으면 카카오 등 미리보기가 잘못된 경로로 묶일 수 있음.
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
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '').split('/')[0];
    if (host) return `https://${host}`;
  }
  return 'http://localhost:3000';
}

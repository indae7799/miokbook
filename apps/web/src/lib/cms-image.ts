/**
 * CMS에 `/uploads/...` 로 저장된 배너·팝업 URL은 next/image 최적화(`/_next/image`)를 타면
 * Vercel(서버리스)에서 원본 파일이 없거나 로컬 경로 처리로 400이 나는 경우가 많다.
 * Firebase 등 절대 URL은 그대로 최적화한다.
 */
export function cmsImageUnoptimized(src: string | undefined | null): boolean {
  if (src == null || typeof src !== 'string') return false;
  const s = src.trim();
  if (s.startsWith('/uploads/')) return true;
  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      const u = new URL(s);
      if (u.pathname.startsWith('/uploads/')) return true;

      const host = u.hostname.toLowerCase();
      return (
        host.endsWith('.supabase.co') ||
        host === 'firebasestorage.googleapis.com' ||
        host.endsWith('.firebasestorage.app') ||
        host === 'storage.googleapis.com'
      );
    }
  } catch {
    /* ignore */
  }
  return false;
}

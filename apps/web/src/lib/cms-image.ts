export function isFirebaseStorageUrl(src: string | undefined | null): boolean {
  if (src == null || typeof src !== 'string') return false;
  const s = src.trim();
  try {
    if (s.startsWith('http://') || s.startsWith('https://')) {
      const u = new URL(s);
      const host = u.hostname.toLowerCase();
      return host === 'firebasestorage.googleapis.com' || host.endsWith('.firebasestorage.app');
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function resolveCmsImageUrl(src: string | undefined | null): string {
  if (src == null || typeof src !== 'string') return '';
  return src.trim();
}

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

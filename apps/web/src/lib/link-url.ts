const SCHEME_PREFIX_RE = /^[a-z][a-z\d+\-.]*:/i;

function withLeadingSlash(path: string): string {
  if (!path) return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * CMS 입력 링크를 스토어에서 안전하게 사용할 수 있는 href로 정규화한다.
 * - `concert-20251213` 같은 레거시 값은 `/concerts/concert-20251213`로 보정
 * - 내부 경로는 슬래시를 보장
 * - 외부 스킴(http/https/mailto/tel 등)은 그대로 유지
 */
export function normalizeCmsLinkUrl(raw: string | null | undefined, fallback = '/'): string {
  const value = (raw ?? '').trim();
  if (!value) return fallback;

  if (value.startsWith('#') || value.startsWith('?')) return value;
  if (value.startsWith('//')) return `https:${value}`;
  if (SCHEME_PREFIX_RE.test(value)) return value;

  const normalized = value.replace(/^\/+/, '');

  if (normalized.startsWith('concert-')) {
    return `/concerts/${normalized}`;
  }

  return withLeadingSlash(normalized);
}

export function isExternalLinkUrl(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

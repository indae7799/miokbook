import { MeiliSearch } from 'meilisearch';

const host = process.env.NEXT_PUBLIC_MEILISEARCH_HOST ?? '';

/** 프로덕션에서 localhost Meili URL은 Vercel 서버 기준으로 의미 없음 → 매 요청 타임아웃·빈 검색 유발 */
function isMeilisearchHostDisabledInThisRuntime(h: string): boolean {
  const trimmed = h.trim().toLowerCase();
  if (!trimmed) return true;
  if (process.env.NODE_ENV !== 'production') return false;
  return (
    trimmed.startsWith('http://localhost') ||
    trimmed.startsWith('https://localhost') ||
    trimmed.includes('127.0.0.1')
  );
}

/**
 * Server-side only.
 * MEILISEARCH_MASTER_KEY — 서버 전용 마스터 키 (관리/쓰기 가능).
 * 클라이언트 번들에서 사용 금지.
 */
export function getMeilisearchServer(): MeiliSearch | null {
  const key = process.env.MEILISEARCH_MASTER_KEY;
  if (!host || !key || isMeilisearchHostDisabledInThisRuntime(host)) return null;
  return new MeiliSearch({ host, apiKey: key });
}

/**
 * 읽기 전용 클라이언트.
 * NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY — 검색 전용 키 (읽기 전용).
 */
export function getMeilisearchClient(): MeiliSearch | null {
  const key = process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY;
  if (!host || !key || isMeilisearchHostDisabledInThisRuntime(host)) return null;
  return new MeiliSearch({ host, apiKey: key });
}

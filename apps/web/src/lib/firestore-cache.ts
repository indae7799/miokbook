/**
 * Firestore reads 절감용 TTL 기반 메모리 캐시
 * - 서버 메모리에 캐시하여 동일 데이터 반복 요청 시 Firestore 호출 생략
 */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const caches = new Map<string, Map<string, CacheEntry<unknown>>>();

function getCache<T>(namespace: string): Map<string, CacheEntry<T>> {
  let m = caches.get(namespace) as Map<string, CacheEntry<T>> | undefined;
  if (!m) {
    m = new Map();
    caches.set(namespace, m as Map<string, CacheEntry<unknown>>);
  }
  return m;
}

/**
 * TTL 내 캐시가 있으면 반환, 없으면 fetcher 실행 후 캐시
 * @param namespace 캐시 네임스페이스 (예: 'home', 'cms', 'book')
 * @param key 캐시 키 (예: 'home-data', 'cms:home', 'book:978...')
 * @param ttlMs TTL (밀리초)
 * @param fetcher 캐시 미스 시 실행할 비동기 함수
 */
export async function getOrSet<T>(
  namespace: string,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cache = getCache<T>(namespace);
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  const data = await fetcher();
  cache.set(key, { data, ts: Date.now() });
  // LRU 스타일: 네임스페이스당 최대 200개
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return data;
}

/** 캐시 무효화 (CMS 수정 시 호출) */
export function invalidate(namespace: string, key?: string): void {
  const cache = caches.get(namespace);
  if (!cache) return;
  if (key) cache.delete(key);
  else cache.clear();
}

/** TTL 상수 (ms) */
export const TTL = {
  HOME: 5 * 60 * 1000,       // 5분 - 홈페이지
  CMS: 5 * 60 * 1000,        // 5분 - cms/home
  BOOK: 5 * 60 * 1000,       // 5분 - 도서 상세
  SEARCH: 2 * 60 * 1000,     // 2분 - 검색 결과
  POPUP: 5 * 60 * 1000,      // 5분 - 팝업
  SITEMAP: 60 * 60 * 1000,   // 1시간 - 사이트맵 (검색엔진 크롤 시 reads 폭증 방지)
  EVENTS: 5 * 60 * 1000,     // 5분 - 이벤트 목록
  ARTICLES: 5 * 60 * 1000,   // 5분 - 콘텐츠 목록
  EVENT: 5 * 60 * 1000,      // 5분 - 이벤트 상세
  ARTICLE: 5 * 60 * 1000,    // 5분 - 콘텐츠 상세
  YOUTUBE_CONTENTS: 5 * 60 * 1000, // 5분 - 유튜브 콘텐츠 목록
} as const;

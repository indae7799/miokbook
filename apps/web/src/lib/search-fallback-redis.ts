/**
 * Meilisearch 불가 시 Firestore 대신 쓸 도서 목록 스냅샷 — Upstash Redis (서버리스 간 공유)
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN 설정 시에만 동작
 */
import { Redis } from '@upstash/redis';

const REDIS_KEY = 'search:books:active:snapshot:v1';
const TTL_SEC = 600; // 10분

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export type FallbackBookRow = {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
  category: string;
  status: string;
  rating: number;
};

export async function getFallbackBooksFromRedis(): Promise<FallbackBookRow[] | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(REDIS_KEY);
    if (Array.isArray(raw)) return raw as FallbackBookRow[];
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw) as FallbackBookRow[];
      return Array.isArray(parsed) ? parsed : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setFallbackBooksToRedis(rows: FallbackBookRow[]): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(REDIS_KEY, JSON.stringify(rows), { ex: TTL_SEC });
  } catch (e) {
    console.warn('[search-fallback-redis] set failed', e);
  }
}

import { getOrSet, TTL } from '@/lib/firestore-cache';
import { isUiDesignMode } from '@/lib/design-mode';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  type BookMeta,
  type YoutubeExposureTarget,
  coerceYoutubeContentPublished,
  extractYoutubeId,
  getYoutubeThumbnail,
  normalizeYoutubeExposureTargets,
} from '@/types/youtube-content';

function normalizeYoutubeId(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  return extractYoutubeId(s) ?? (s.length === 11 && /^[\w-]{11}$/.test(s) ? s : '');
}

export interface YoutubeContentListItem {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  youtubeId: string;
  externalPlaybackUrl: string;
  description: string;
  relatedBooks: BookMeta[];
  exposureTargets: YoutubeExposureTarget[];
}

function mapBookRow(row: {
  isbn: string;
  title?: string | null;
  author?: string | null;
  publisher?: string | null;
  cover_image?: string | null;
  slug?: string | null;
}): BookMeta {
  return {
    id: row.isbn,
    isbn: row.isbn,
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    publisher: String(row.publisher ?? ''),
    cover: String(row.cover_image ?? ''),
    slug: row.slug ? String(row.slug) : undefined,
  };
}

type YoutubeContentRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  youtube_id: string;
  external_playback_url: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  related_isbns: string[] | null;
  exposure_targets: string[] | null;
};

/**
 * sort_order 컬럼이 없는(마이그레이션 전) DB는 created_at 정렬로 폴백.
 * PostgREST에서 컬럼명 order 는 예약어 충돌로 실패할 수 있어 sort_order 사용.
 */
async function queryYoutubeContentRows(): Promise<YoutubeContentRow[] | null> {
  if (!supabaseAdmin) return null;

  const primary = await supabaseAdmin
    .from('youtube_contents')
    .select('id, slug, title, description, youtube_id, external_playback_url, thumbnail_url, is_published, sort_order, related_isbns, exposure_targets')
    .order('sort_order', { ascending: true });

  if (!primary.error && primary.data) {
    return primary.data as YoutubeContentRow[];
  }

  console.warn('[youtube-store] sort_order query failed, legacy fallback:', primary.error?.message);

  const legacy = await supabaseAdmin
    .from('youtube_contents')
    .select('id, slug, title, description, youtube_id, external_playback_url, thumbnail_url, is_published, related_isbns, exposure_targets, created_at')
    .order('created_at', { ascending: true });

  if (!legacy.error && legacy.data) {
    return legacy.data as YoutubeContentRow[];
  }

  console.error('[youtube-store] legacy youtube_contents query failed:', legacy.error?.message);

  const legacyWithoutExternal = await supabaseAdmin
    .from('youtube_contents')
    .select('id, slug, title, description, youtube_id, thumbnail_url, is_published, related_isbns, exposure_targets, created_at')
    .order('created_at', { ascending: true });

  if (legacyWithoutExternal.error || !legacyWithoutExternal.data) {
    console.error('[youtube-store] no-external fallback failed:', legacyWithoutExternal.error?.message);
    return null;
  }

  return (legacyWithoutExternal.data as Array<Omit<YoutubeContentRow, 'external_playback_url'> & { created_at: string }>).map((row) => ({
    ...row,
    external_playback_url: '',
  }));
}

async function buildAllPublishedYoutubeItems(): Promise<YoutubeContentListItem[]> {
  try {
    const data = await queryYoutubeContentRows();
    if (!data) return [];

    const publishedRows = data.filter((row) => coerceYoutubeContentPublished(row.is_published));

    const allIsbns = [
      ...new Set(
        publishedRows.flatMap((row) =>
          (Array.isArray(row.related_isbns) ? row.related_isbns : []).map((isbn) => String(isbn)),
        ),
      ),
    ].filter(Boolean);

    let booksByIsbn = new Map<string, BookMeta>();

    if (allIsbns.length > 0 && supabaseAdmin) {
      const chunks: string[][] = [];
      for (let i = 0; i < allIsbns.length; i += 30) chunks.push(allIsbns.slice(i, i + 30));

      const bookResults = await Promise.all(
        chunks.map(async (chunk) => {
          const { data: books, error: booksError } = await supabaseAdmin!
            .from('books')
            .select('isbn, title, author, publisher, cover_image, slug')
            .in('isbn', chunk);
          if (booksError || !books) return [];
          return books.map(mapBookRow);
        }),
      );

      booksByIsbn = new Map(bookResults.flat().map((book) => [book.isbn, book]));
    }

    return publishedRows.map((row) => {
      const youtubeId = normalizeYoutubeId(String(row.youtube_id ?? ''));
      return {
      id: row.id,
      slug: String(row.slug ?? ''),
      title: String(row.title ?? ''),
      youtubeId,
      externalPlaybackUrl: String(row.external_playback_url ?? ''),
      description: String(row.description ?? ''),
      thumbnailUrl:
        row.thumbnail_url || (youtubeId ? getYoutubeThumbnail(youtubeId, 'hq') : ''),
      exposureTargets: normalizeYoutubeExposureTargets(row.exposure_targets),
      relatedBooks: (Array.isArray(row.related_isbns) ? row.related_isbns : [])
        .map((isbn) => booksByIsbn.get(String(isbn)))
        .filter((book): book is BookMeta => Boolean(book)),
    };
    });
  } catch (e) {
    console.error('[youtube-store] buildAllPublishedYoutubeItems:', e);
    return [];
  }
}

/** 공개된 항목 전체를 한 번만 조회해 캐시 — 노출 타깃은 메모리에서 필터 */
export async function getPublishedYoutubeContentsList(target: YoutubeExposureTarget = 'youtube'): Promise<YoutubeContentListItem[]> {
  if (isUiDesignMode()) return [];

  const all = await getOrSet('youtubeContents', 'publishedAll', TTL.YOUTUBE_CONTENTS, buildAllPublishedYoutubeItems);
  return all.filter((item) => item.exposureTargets.includes(target));
}

/** 홈 랜딩: 유튜브·북콘서트 노출 모두 포함 */
export async function getPublishedYoutubeContentsForHome(limit: number): Promise<YoutubeContentListItem[]> {
  if (isUiDesignMode()) return [];

  const all = await getOrSet('youtubeContents', 'publishedAll', TTL.YOUTUBE_CONTENTS, buildAllPublishedYoutubeItems);
  return all
    .filter(
      (item) => item.exposureTargets.includes('youtube') || item.exposureTargets.includes('concert'),
    )
    .slice(0, Math.max(0, limit));
}

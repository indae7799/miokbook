import { getOrSet, TTL } from '@/lib/firestore-cache';
import { isUiDesignMode } from '@/lib/design-mode';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  type BookMeta,
  type YoutubeExposureTarget,
  coerceYoutubeContentPublished,
  getYoutubeThumbnail,
  normalizeYoutubeExposureTargets,
} from '@/types/youtube-content';

export interface YoutubeContentListItem {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string;
  youtubeId: string;
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

export async function getPublishedYoutubeContentsList(target: YoutubeExposureTarget = 'youtube'): Promise<YoutubeContentListItem[]> {
  if (isUiDesignMode()) return [];

  return getOrSet('youtubeContents', 'list', TTL.YOUTUBE_CONTENTS, async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('youtube_contents')
        .select('id, slug, title, description, youtube_id, thumbnail_url, is_published, order, related_isbns, exposure_targets')
        .order('order', { ascending: true });

      if (error || !data) return [];

      const publishedRows = data.filter((row) => {
        if (!coerceYoutubeContentPublished(row.is_published)) return false;
        return normalizeYoutubeExposureTargets(row.exposure_targets).includes(target);
      });
      const allIsbns = [...new Set(
        publishedRows.flatMap((row) => (Array.isArray(row.related_isbns) ? row.related_isbns : []).map((isbn) => String(isbn)))
      )].filter(Boolean);

      let booksByIsbn = new Map<string, BookMeta>();

      if (allIsbns.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < allIsbns.length; i += 30) chunks.push(allIsbns.slice(i, i + 30));

        const bookResults = await Promise.all(
          chunks.map(async (chunk) => {
            const { data: books, error: booksError } = await supabaseAdmin
              .from('books')
              .select('isbn, title, author, publisher, cover_image, slug')
              .in('isbn', chunk);
            if (booksError || !books) return [];
            return books.map(mapBookRow);
          }),
        );

        booksByIsbn = new Map(bookResults.flat().map((book) => [book.isbn, book]));
      }

      return publishedRows
        .map((row) => ({
          id: row.id,
          slug: String(row.slug ?? ''),
          title: String(row.title ?? ''),
          youtubeId: String(row.youtube_id ?? '').trim(),
          description: String(row.description ?? ''),
          thumbnailUrl: row.thumbnail_url || (row.youtube_id ? getYoutubeThumbnail(String(row.youtube_id).trim(), 'hq') : ''),
          exposureTargets: normalizeYoutubeExposureTargets(row.exposure_targets),
          relatedBooks: (Array.isArray(row.related_isbns) ? row.related_isbns : [])
            .map((isbn) => booksByIsbn.get(String(isbn)))
            .filter((book): book is BookMeta => Boolean(book)),
        }));
    } catch (e) {
      console.error('[youtube-store] getPublishedYoutubeContentsList:', e);
      return [];
    }
  });
}

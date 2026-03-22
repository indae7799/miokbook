import { notFound } from 'next/navigation';
import { youtubeContentSlugSearchVariants } from '@/lib/youtube-content-slug';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  type BookMeta,
  type YoutubeContent,
  coerceYoutubeContentPublished,
  isSafeHttpUrl,
  normalizeYoutubeExposureTargets,
} from '@/types/youtube-content';
import YoutubeContentViewer from '@/components/content/YoutubeContentViewer';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
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

async function fetchBooksByIsbns(isbns: string[]): Promise<BookMeta[]> {
  if (!isbns.length) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < isbns.length; i += 30) chunks.push(isbns.slice(i, i + 30));

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabaseAdmin
        .from('books')
        .select('isbn, title, author, publisher, cover_image, slug')
        .in('isbn', chunk);
      if (error || !data) return [];
      return data.map(mapBookRow);
    }),
  );

  const flat = results.flat();
  return isbns
    .map((isbn) => flat.find((book) => book.isbn === isbn))
    .filter((book): book is BookMeta => Boolean(book));
}

export default async function YoutubeContentVideoPage({ params }: Props) {
  const { slug: slugParam } = await params;

  let content:
    | (YoutubeContent & {
        id: string;
        youtube_id?: string | null;
        thumbnail_url?: string | null;
        is_published?: boolean | string | number | null;
        related_isbns?: string[] | null;
        related_youtube_ids?: string[] | null;
        exposure_targets?: string[] | null;
        published_at?: string | null;
        created_at?: string | null;
      })
    | null = null;

  for (const slugTry of youtubeContentSlugSearchVariants(slugParam)) {
    const { data, error } = await supabaseAdmin
      .from('youtube_contents')
      .select('*')
      .eq('slug', slugTry)
      .limit(20);

    if (error || !data) continue;
    const hit = data.find((row) => coerceYoutubeContentPublished(row.is_published));
    if (hit) {
      content = {
        id: hit.id,
        slug: String(hit.slug ?? ''),
        title: String(hit.title ?? ''),
        description: hit.description ?? '',
        mainYoutubeId: String(hit.youtube_id ?? ''),
        externalPlaybackUrl: String((hit as { external_playback_url?: string | null }).external_playback_url ?? ''),
        relatedYoutubeIds: Array.isArray(hit.related_youtube_ids) ? hit.related_youtube_ids : [],
        exposureTargets: normalizeYoutubeExposureTargets(hit.exposure_targets),
        customThumbnailUrl: hit.thumbnail_url ?? '',
        relatedIsbns: Array.isArray(hit.related_isbns) ? hit.related_isbns : [],
        publishedAt: hit.published_at ?? '',
        isPublished: coerceYoutubeContentPublished(hit.is_published),
        order: Number(
          (hit as { sort_order?: unknown; order?: unknown }).sort_order ??
            (hit as { order?: unknown }).order ??
            0,
        ),
        createdAt: hit.created_at ?? undefined,
      };
      break;
    }
  }

  if (!content) notFound();

  const yt = String(content.mainYoutubeId ?? '').trim();
  const ext = String(content.externalPlaybackUrl ?? '').trim();
  const extOk = ext.length > 0 && isSafeHttpUrl(ext);
  if (!yt && !extOk) notFound();

  const books = await fetchBooksByIsbns(content.relatedIsbns ?? []);

  return <YoutubeContentViewer content={content} books={books} />;
}

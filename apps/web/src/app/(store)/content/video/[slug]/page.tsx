import { notFound } from 'next/navigation';
import { youtubeContentSlugSearchVariants } from '@/lib/youtube-content-slug';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  type BookMeta,
  type YoutubeContent,
  coerceYoutubeContentPublished,
  isSafeHttpUrl,
  normalizeStringArray,
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
  description?: string | null;
  cover_image?: string | null;
  slug?: string | null;
}): BookMeta {
  return {
    id: row.isbn,
    isbn: row.isbn,
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    publisher: String(row.publisher ?? ''),
    description: String(row.description ?? ''),
    cover: String(row.cover_image ?? ''),
    slug: row.slug ? String(row.slug) : undefined,
  };
}

async function fetchAladinBookByIsbn(isbn: string): Promise<BookMeta | null> {
  const ttbKey = process.env.ALADIN_TTB_KEY ?? process.env.ALADIN_API_KEY;
  if (!ttbKey || !isbn.trim()) return null;

  const params = new URLSearchParams({
    TTBKey: ttbKey,
    ItemIdType: 'ISBN13',
    ItemId: isbn,
    output: 'js',
    Version: '20131101',
    Cover: 'Big',
    OptResult: 'description',
  });

  const res = await fetch(`http://www.aladin.co.kr/ttb/api/ItemLookUp.aspx?${params}`, {
    next: { revalidate: 3600 },
  }).catch(() => null);
  if (!res) return null;

  const text = await res.text();
  let data: { item?: Array<{
    isbn13?: string;
    isbn?: string;
    title?: string;
    author?: string;
    publisher?: string;
    cover?: string;
    link?: string;
    description?: string;
  }> };

  try {
    data = JSON.parse(text.replace(/;\s*$/, '').trim()) as typeof data;
  } catch {
    return null;
  }

  const item = data.item?.[0];
  if (!item) return null;

  return {
    id: item.isbn13 || item.isbn || isbn,
    isbn: item.isbn13 || item.isbn || isbn,
    title: item.title ?? '',
    author: item.author ?? '',
    publisher: item.publisher ?? '',
    description: item.description ?? '',
    cover: item.cover ?? '',
    link: item.link,
    source: 'aladin',
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
        .select('isbn, title, author, publisher, description, cover_image, slug')
        .in('isbn', chunk);
      if (error || !data) return [];
      return data.map(mapBookRow);
    }),
  );

  const flat = results.flat();
  const missingIsbns = isbns.filter((isbn) => !flat.find((book) => book.isbn === isbn));
  const aladinFallback = await Promise.all(missingIsbns.map((isbn) => fetchAladinBookByIsbn(isbn)));
  const merged = [...flat, ...aladinFallback.filter((book): book is BookMeta => Boolean(book))];

  return isbns
    .map((isbn) => merged.find((book) => book.isbn === isbn))
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
      .order('created_at', { ascending: false })
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
        relatedYoutubeIds: normalizeStringArray(hit.related_youtube_ids),
        exposureTargets: normalizeYoutubeExposureTargets(hit.exposure_targets),
        customThumbnailUrl: hit.thumbnail_url ?? '',
        relatedImageUrl: String((hit as { related_image_url?: string | null }).related_image_url ?? ''),
        relatedIsbns: normalizeStringArray(hit.related_isbns),
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

import Link from 'next/link';
import StoreFooter from '@/components/home/StoreFooter';
import type { BookCardBook } from '@/components/books/BookCard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const revalidate = 300;

interface TableRow {
  label: string;
  value: string;
}

interface FeaturedConcert {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  tableRows: TableRow[];
  description: string;
  mapUrl: string;
  date: string | null;
  books: BookCardBook[];
}

interface PastConcert {
  id: string;
  title: string;
  slug: string;
  date: string | null;
}

function toBook(row: {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  cover_image: string;
  list_price: number;
  sale_price: number;
}) {
  return {
    isbn: row.isbn,
    slug: row.slug ?? '',
    title: row.title ?? '',
    author: row.author ?? '',
    coverImage: row.cover_image ?? '',
    listPrice: row.list_price ?? 0,
    salePrice: row.sale_price ?? 0,
  };
}

async function getConcerts(): Promise<{ featured: FeaturedConcert | null; past: PastConcert[] }> {
  try {
    const { data, error } = await supabaseAdmin.from('concerts').select('*').eq('is_active', true);
    if (error) throw error;

    const all = (data ?? [])
      .map(mapConcertRow)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    if (all.length === 0) return { featured: null, past: [] };

    const [first, ...rest] = all;
    const isbns = Array.isArray(first.bookIsbns) ? first.bookIsbns.filter(Boolean) : [];
    let books: BookCardBook[] = [];

    if (isbns.length > 0) {
      const { data: bookRows, error: bookError } = await supabaseAdmin
        .from('books')
        .select('isbn, slug, title, author, cover_image, list_price, sale_price, is_active')
        .in('isbn', isbns);

      if (bookError) throw bookError;

      const byIsbn = new Map((bookRows ?? []).map((book) => [book.isbn, book]));
      books = isbns
        .map((isbn) => byIsbn.get(isbn))
        .filter((book): book is NonNullable<typeof book> => Boolean(book))
        .filter((book) => book.is_active !== false)
        .map(toBook);
    }

    return {
      featured: {
        id: first.id,
        title: first.title ?? '',
        slug: first.slug || first.id,
        imageUrl: first.imageUrl ?? '',
        tableRows: Array.isArray(first.tableRows) ? (first.tableRows as unknown as TableRow[]) : [],
        description: first.description ?? '',
        mapUrl: first.googleMapsEmbedUrl ?? '',
        date: first.date,
        books,
      },
      past: rest.slice(0, 5).map((c) => ({
        id: c.id,
        title: c.title ?? '',
        slug: c.slug || c.id,
        date: c.date,
      })),
    };
  } catch {
    return { featured: null, past: [] };
  }
}

export default async function ConcertsPage() {
  const { featured, past } = await getConcerts();

  const venueRegex = /^(장소|venue|위치|주소)$/i;
  const venueRow = featured?.tableRows.find((r) => venueRegex.test(r.label.trim()));
  const infoRows = featured?.tableRows.filter((r) => !venueRegex.test(r.label.trim())) ?? [];

  return (
    <main className="min-h-screen py-6 max-w-[1400px] mx-auto px-4 sm:px-6">
      <div className="mb-8 pb-6 border-b border-border">
        <h1 className="text-2xl font-semibold tracking-tight">북콘서트</h1>
        <p className="text-sm text-muted-foreground mt-1">미옥서원에서 만나는 저자와의 시간</p>
      </div>

      {!featured ? (
        <p className="text-sm text-muted-foreground py-12">예정된 북콘서트가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 items-start">
          <article>
            {featured.imageUrl && (
              <img
                src={featured.imageUrl}
                alt={featured.title}
                className="w-full h-auto block mb-6"
              />
            )}

            <h2 className="text-xl font-bold leading-snug tracking-tight mb-3">{featured.title}</h2>

            {featured.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line mb-6">
                {featured.description}
              </p>
            )}

            {infoRows.length > 0 && (
              <dl className="mb-6 divide-y divide-border border-y border-border">
                {infoRows.map((row, i) => (
                  <div key={i} className="flex gap-4 py-2.5 text-sm">
                    <dt className="w-20 shrink-0 text-muted-foreground">{row.label}</dt>
                    <dd className="text-foreground whitespace-pre-line">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {featured.books.length > 0 && (
              <div className="mb-8">
                <p className="text-xs text-muted-foreground font-medium tracking-widest uppercase mb-3">관련 도서</p>
                <div className="flex gap-3 flex-wrap">
                  {featured.books.map((book) => (
                    <Link
                      key={book.isbn}
                      href={`/books/${book.slug}`}
                      className="shrink-0 w-[72px] hover:opacity-80 transition-opacity"
                    >
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full aspect-[2/3] object-cover rounded shadow-sm"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] bg-muted rounded" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {featured.mapUrl && (
              <div className="flex items-center justify-between gap-4 py-4 px-5 rounded-lg border border-border bg-muted/30">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">지도 보기</p>
                  <p className="text-sm font-medium truncate">{venueRow?.value || '미옥서원'}</p>
                </div>
                <a
                  href={featured.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-sm font-medium text-primary hover:underline whitespace-nowrap"
                >
                  지도 열기
                </a>
              </div>
            )}
          </article>

          <aside className="lg:border-l lg:border-border lg:pl-8 pt-0 lg:pt-1">
            <p className="text-[11px] font-bold text-muted-foreground tracking-[0.14em] uppercase mb-4">
              지난 북콘서트
            </p>

            <ol className="space-y-0">
              {past.map((c, i) => (
                <li key={c.id} className="border-t border-border first:border-t-0">
                  <Link
                    href={`/concerts/${c.slug}`}
                    className="flex items-start gap-3 py-3.5 group"
                  >
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground/50 tabular-nums pt-0.5 w-5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[13px] leading-snug text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {c.title}
                    </span>
                  </Link>
                </li>
              ))}

              {Array.from({ length: Math.max(0, 5 - past.length) }).map((_, i) => (
                <li key={`ph-${i}`} className="border-t border-border first:border-t-0">
                  <div className="flex items-start gap-3 py-3.5 opacity-20 select-none">
                    <span className="shrink-0 text-[11px] font-bold text-muted-foreground tabular-nums pt-0.5 w-5">
                      {String(past.length + i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-2.5 bg-muted rounded w-full" />
                      <div className="h-2.5 bg-muted rounded w-3/5" />
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      )}

      <div className="mt-20">
        <StoreFooter />
      </div>
    </main>
  );
}

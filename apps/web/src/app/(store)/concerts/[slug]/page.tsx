import { notFound } from 'next/navigation';
import Link from 'next/link';
import StoreFooter from '@/components/home/StoreFooter';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import type { BookCardBook } from '@/components/books/BookCard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const revalidate = 300;

interface TableRow {
  label: string;
  value: string;
}

interface ConcertDetail {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  tableRows: TableRow[];
  books: BookCardBook[];
  description: string;
  googleMapsEmbedUrl: string;
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

async function getConcert(slug: string): Promise<ConcertDetail | null> {
  try {
    const { data: concertRow, error } = await supabaseAdmin
      .from('concerts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!concertRow || concertRow.is_active === false) return null;

    const concert = mapConcertRow(concertRow);
    const isbns = Array.isArray(concert.bookIsbns) ? concert.bookIsbns.filter(Boolean) : [];
    let books: BookCardBook[] = [];

    if (isbns.length > 0) {
      const { data: bookRows, error: booksError } = await supabaseAdmin
        .from('books')
        .select('isbn, slug, title, author, cover_image, list_price, sale_price, is_active')
        .in('isbn', isbns);

      if (booksError) throw booksError;

      const byIsbn = new Map((bookRows ?? []).map((book) => [book.isbn, book]));
      books = isbns
        .map((isbn) => byIsbn.get(isbn))
        .filter((book): book is NonNullable<typeof book> => Boolean(book))
        .filter((book) => book.is_active !== false)
        .map(toBook);
    }

    return {
      id: concert.id,
      title: concert.title,
      slug: concert.slug || concert.id,
      imageUrl: concert.imageUrl,
      tableRows: Array.isArray(concert.tableRows) ? (concert.tableRows as unknown as TableRow[]) : [],
      books,
      description: concert.description,
      googleMapsEmbedUrl: concert.googleMapsEmbedUrl,
      date: concert.date,
    };
  } catch {
    return null;
  }
}

export default async function ConcertDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concert = await getConcert(slug);
  if (!concert) notFound();

  const venueRow = concert.tableRows.find((r) => /^(장소|venue|위치|주소)$/i.test(r.label.trim()));

  return (
    <main className="min-h-screen py-6 max-w-[960px] mx-auto px-4 sm:px-6">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/concerts">북콘서트</Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight leading-snug">{concert.title}</h1>
      </div>

      {concert.imageUrl && (
        <div className="rounded-lg overflow-hidden bg-muted mb-8">
          <img
            src={concert.imageUrl}
            alt={concert.title}
            className="w-full h-auto block"
          />
        </div>
      )}

      {concert.tableRows.length > 0 && (
        <div className="mb-10 rounded-lg border border-border overflow-hidden text-sm">
          {concert.tableRows.map((row, i) => (
            <div
              key={i}
              className={`flex ${i < concert.tableRows.length - 1 ? 'border-b border-border' : ''}`}
            >
              <span className="w-24 shrink-0 px-4 py-3 font-medium bg-muted/50 text-foreground whitespace-nowrap">
                {row.label}
              </span>
              <span className="flex-1 px-4 py-3 text-foreground whitespace-pre-line">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {(concert.books.length > 0 || concert.description) && (
        <div className="mb-12 grid grid-cols-1 lg:grid-cols-2 gap-10">
          {concert.books.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-4">관련 도서</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {concert.books.map((book) => (
                  <BookCard key={book.isbn} book={book} />
                ))}
              </div>
            </div>
          )}
          {concert.description && (
            <div>
              <h2 className="text-base font-semibold mb-4">소개</h2>
              <p className="text-sm text-foreground leading-[1.85] whitespace-pre-line">
                {concert.description}
              </p>
            </div>
          )}
        </div>
      )}

      {concert.googleMapsEmbedUrl && (
        <div className="mb-12">
          <div className="flex items-center justify-between gap-4 py-4 px-5 rounded-lg border border-border bg-muted/30">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5">지도 보기</p>
              <p className="text-sm font-medium truncate">
                {venueRow?.value || '미옥서원'}
              </p>
            </div>
            <a
              href={concert.googleMapsEmbedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-medium text-primary hover:underline whitespace-nowrap"
            >
              지도 열기
            </a>
          </div>
        </div>
      )}

      <StoreFooter />
    </main>
  );
}

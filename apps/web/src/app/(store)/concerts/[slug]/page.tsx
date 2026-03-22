import { notFound } from 'next/navigation';
import Link from 'next/link';
import StoreFooter from '@/components/home/StoreFooter';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';
import type { BookCardBook } from '@/components/books/BookCard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';
import ConcertPurchasePanel from '@/components/concerts/ConcertPurchasePanel';

export const revalidate = 300;

interface TableRow {
  label: string;
  value: string;
}

interface FeaturedBook extends BookCardBook {
  publisher: string;
  description: string;
}

interface ConcertDetail {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  tableRows: TableRow[];
  books: FeaturedBook[];
  description: string;
  googleMapsEmbedUrl: string;
  bookingUrl: string;
  bookingLabel: string;
  bookingNoticeTitle: string;
  bookingNoticeBody: string;
  feeLabel: string;
  feeNote: string;
  hostNote: string;
  statusBadge: string;
  ticketPrice: number;
  ticketOpen: boolean;
  date: string | null;
}

function parsePriceLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function toBook(row: {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  publisher: string;
  description: string;
  cover_image: string;
  list_price: number;
  sale_price: number;
}) {
  return {
    isbn: row.isbn,
    slug: row.slug ?? '',
    title: row.title ?? '',
    author: row.author ?? '',
    publisher: row.publisher ?? '',
    description: row.description ?? '',
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
    let books: FeaturedBook[] = [];

    if (isbns.length > 0) {
      const { data: bookRows, error: booksError } = await supabaseAdmin
        .from('books')
        .select('isbn, slug, title, author, publisher, description, cover_image, list_price, sale_price, is_active')
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
      bookingUrl: concert.bookingUrl,
      bookingLabel: concert.bookingLabel,
      bookingNoticeTitle: concert.bookingNoticeTitle,
      bookingNoticeBody: concert.bookingNoticeBody,
      feeLabel: concert.feeLabel,
      feeNote: concert.feeNote,
      hostNote: concert.hostNote,
      statusBadge: concert.statusBadge,
      ticketPrice: concert.ticketPrice > 0 ? concert.ticketPrice : parsePriceLabel(concert.feeLabel),
      ticketOpen: concert.ticketOpen || concert.ticketPrice > 0 || parsePriceLabel(concert.feeLabel) > 0,
      date: concert.date,
    };
  } catch {
    return null;
  }
}

function formatConcertDate(date: string | null) {
  if (!date) return '';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return value.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function ConcertDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const concert = await getConcert(slug);
  if (!concert) notFound();

  const primaryBook = concert.books[0] ?? null;
  const infoRows = concert.tableRows.filter((row) => row.label.trim() && row.value.trim());

  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Button variant="ghost" asChild>
            <Link href="/concerts">북콘서트</Link>
          </Button>
        </div>

        <section className="border-b border-[#2f241f]/10 pb-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_320px] xl:items-end">
            <div className="max-w-4xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">
                Miok Seowon Book Concert
              </p>
              <h1 className="mt-4 font-myeongjo text-[34px] font-bold leading-[1.14] tracking-tight text-[#201714] sm:text-[48px] xl:text-[56px]">
                {concert.title}
              </h1>
              {concert.date ? (
                <p className="mt-4 text-sm font-medium text-[#5c4741]">{formatConcertDate(concert.date)}</p>
              ) : null}
              {concert.description ? (
                <p className="mt-5 max-w-3xl whitespace-pre-line text-[15px] leading-8 text-[#4b3c37]">
                  {concert.description}
                </p>
              ) : null}
            </div>

            <aside className="grid gap-3 border-t border-[#2f241f]/10 pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8d6e5a]">Status</p>
                <p className="mt-2 text-[24px] font-semibold leading-none text-[#201714]">
                  {concert.statusBadge || concert.feeLabel || 'Book Concert'}
                </p>
              </div>
              {(concert.feeNote || concert.hostNote) ? (
                <p className="text-sm leading-6 text-[#62514a]">
                  {concert.feeNote || concert.hostNote}
                </p>
              ) : null}
            </aside>
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_380px] xl:gap-10">
          <div className="space-y-6">
            {concert.imageUrl ? (
              <div className="overflow-hidden rounded-[30px] border border-[#2f241f]/8 bg-[#efe4d5] shadow-[0_24px_60px_-36px_rgba(36,24,21,0.32)]">
                <img src={concert.imageUrl} alt={concert.title} className="block h-auto w-full" />
              </div>
            ) : null}

            {infoRows.length > 0 ? (
              <section className="border-t border-[#2f241f]/10 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#722f37]">Information</p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1e1715]">행사 안내</h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {infoRows.map((row, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      className="rounded-[24px] border border-[#722f37]/10 bg-[linear-gradient(180deg,#fffefc_0%,#f7f1e8_100%)] p-4 shadow-[0_18px_48px_-42px_rgba(36,24,21,0.4)]"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#722f37]">{row.label}</p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-[#2c2421]">{row.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {concert.books.length > 0 ? (
              <section className="border-t border-[#2f241f]/10 pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#722f37]">Related Book</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#1e1715]">관련 도서</h2>
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {concert.books.map((book) => (
                    <BookCard key={book.isbn} book={book} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-6 lg:sticky lg:top-24">
            {primaryBook ? (
              <section className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_24px_80px_-44px_rgba(36,24,21,0.3)]">
                <div className="grid grid-cols-[108px_1fr] gap-4 p-5">
                  <Link href={`/books/${primaryBook.slug}`} className="block overflow-hidden rounded-2xl bg-muted">
                    {primaryBook.coverImage ? (
                      <img src={primaryBook.coverImage} alt={primaryBook.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="aspect-[2/3] w-full bg-muted" />
                    )}
                  </Link>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#722f37]">Featured Book</p>
                    <Link href={`/books/${primaryBook.slug}`} className="mt-2 block text-lg font-bold leading-snug tracking-tight text-[#1e1715] hover:text-[#722f37]">
                      {primaryBook.title}
                    </Link>
                    <p className="mt-1 text-sm text-[#5c4741]">{primaryBook.author}</p>
                    {primaryBook.publisher ? <p className="mt-1 text-xs text-muted-foreground">{primaryBook.publisher}</p> : null}
                  </div>
                </div>
                {primaryBook.description ? (
                  <div className="border-t border-black/5 px-5 py-4 text-sm leading-7 text-[#4b3c37]">
                    {primaryBook.description.slice(0, 220)}
                    {primaryBook.description.length > 220 ? '...' : ''}
                  </div>
                ) : null}
              </section>
            ) : null}

            <ConcertPurchasePanel
              concertId={concert.id}
              concertTitle={concert.title}
              concertSlug={concert.slug}
              feeLabel={concert.feeLabel}
              feeNote={concert.feeNote}
              hostNote={concert.hostNote}
              statusBadge={concert.statusBadge}
              ticketPrice={concert.ticketPrice}
              ticketOpen={concert.ticketOpen}
              bookingUrl={concert.bookingUrl}
              bookingLabel={concert.bookingLabel}
              bookingNoticeTitle={concert.bookingNoticeTitle}
              bookingNoticeBody={concert.bookingNoticeBody}
              mapUrl={concert.googleMapsEmbedUrl}
            />
          </div>
        </section>

        <div className="mt-20">
          <StoreFooter />
        </div>
      </div>
    </main>
  );
}

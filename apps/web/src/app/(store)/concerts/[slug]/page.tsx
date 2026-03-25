import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';
import StoreFooter from '@/components/home/StoreFooter';
import ConcertPurchasePanel from '@/components/concerts/ConcertPurchasePanel';
import FeaturedBookActions from '@/components/concerts/FeaturedBookActions';

export const revalidate = 300;

interface FeaturedBook {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  publisher: string;
  description: string;
  coverImage: string;
  salePrice: number;
}

interface ConcertDetail {
  id: string;
  title: string;
  slug: string;
  imageUrl: string;
  books: FeaturedBook[];
  bookingUrl: string;
  feeLabel: string;
  feeNote: string;
  hostNote: string;
  statusBadge: string;
  ticketPrice: number;
  ticketOpen: boolean;
  date: string | null;
}

function normalizeConcertSlug(value: string): string {
  return value
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parsePriceLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function formatConcertDate(date: string | null) {
  if (!date) return '일정 추후 공개';
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return '일정 추후 공개';
  return value.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function getConcert(slug: string): Promise<ConcertDetail | null> {
  try {
    const normalizedSlug = normalizeConcertSlug(slug);
    const { data: bySlug, error: slugError } = await supabaseAdmin
      .from('concerts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (slugError) throw slugError;

    let concertRow = bySlug;

    if (!concertRow) {
      const { data: byId, error: idError } = await supabaseAdmin
        .from('concerts')
        .select('*')
        .eq('id', slug)
        .maybeSingle();

      if (idError) throw idError;
      concertRow = byId;
    }

    if (!concertRow && normalizedSlug) {
      const { data: rows, error: titleError } = await supabaseAdmin
        .from('concerts')
        .select('*')
        .eq('is_active', true)
        .order('date', { ascending: false, nullsFirst: false });

      if (titleError) throw titleError;

      concertRow =
        (rows ?? []).find((row) => normalizeConcertSlug(String(row.slug ?? '')) === normalizedSlug) ??
        (rows ?? []).find((row) => normalizeConcertSlug(String(row.title ?? '')) === normalizedSlug) ??
        null;
    }

    if (!concertRow || concertRow.is_active === false) return null;

    const concert = mapConcertRow(concertRow);
    const isbns = Array.isArray(concert.bookIsbns) ? concert.bookIsbns.filter(Boolean) : [];
    let books: FeaturedBook[] = [];

    if (isbns.length > 0) {
      const { data: bookRows, error: booksError } = await supabaseAdmin
        .from('books')
        .select('isbn, slug, title, author, publisher, description, cover_image, sale_price, is_active')
        .in('isbn', isbns);

      if (booksError) throw booksError;

      const byIsbn = new Map((bookRows ?? []).map((book) => [book.isbn, book]));
      books = isbns
        .map((isbn) => byIsbn.get(isbn))
        .filter((book): book is NonNullable<typeof book> => Boolean(book))
        .filter((book) => book.is_active !== false)
        .map((book) => ({
          isbn: book.isbn,
          slug: book.slug ?? '',
          title: book.title ?? '',
          author: book.author ?? '',
          publisher: book.publisher ?? '',
          description: book.description ?? '',
          coverImage: book.cover_image ?? '',
          salePrice: Number(book.sale_price ?? 0),
        }));
    }

    const fallbackPrice = parsePriceLabel(concert.feeLabel);

    return {
      id: concert.id,
      title: concert.title,
      slug: concert.slug || concert.id,
      imageUrl: concert.imageUrl,
      books,
      bookingUrl: concert.bookingUrl || concert.googleMapsEmbedUrl,
      feeLabel: concert.feeLabel,
      feeNote: concert.feeNote || '현장 결제 가능',
      hostNote: concert.hostNote || '',
      statusBadge: concert.statusBadge,
      ticketPrice: concert.ticketPrice > 0 ? concert.ticketPrice : fallbackPrice,
      ticketOpen: concert.ticketOpen || concert.ticketPrice > 0 || fallbackPrice > 0,
      date: concert.date,
    };
  } catch {
    return null;
  }
}

export default async function ConcertDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ entry?: string }>;
}) {
  const { slug } = await params;
  const { entry } = await searchParams;
  const concert = await getConcert(slug);
  if (!concert) notFound();
  const hideReserveButton = entry === 'next-concert';

  const primaryBook = concert.books[0] ?? null;

  return (
    <main className="min-h-screen bg-[#fbf8f3]">
      <div className="mx-auto max-w-[1240px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-5">
          <Button variant="ghost" asChild>
            <Link href="/concerts">북콘서트</Link>
          </Button>
        </div>

        <section className="border-b border-[#2f241f]/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">
            Miok Seowon Book Concert
          </p>
          <h1 className="mt-4 break-keep font-myeongjo text-[22px] font-bold leading-[1.2] tracking-tight text-[#201714] [text-wrap:balance] sm:text-[36px] lg:text-[44px] xl:text-[54px]">
            {concert.title}
          </h1>
          <p className="mt-3 text-sm font-medium text-[#5c4741]">{formatConcertDate(concert.date)}</p>
        </section>

        <section className="mt-3 grid gap-3 sm:mt-6 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
          <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-auto sm:min-h-[540px] lg:h-[760px]">
            {concert.imageUrl ? (
              <Image
                src={concert.imageUrl}
                alt={concert.title}
                width={1200}
                height={900}
                sizes="(max-width: 1024px) 100vw, 760px"
                className="h-full w-full object-contain bg-[#f7f1eb]"
                priority
              />
            ) : (
              <div className="h-full w-full bg-[#efe4d5]" />
            )}
          </div>

          <div className="grid gap-3 lg:h-[760px] lg:grid-rows-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
            <ConcertPurchasePanel
              concertId={concert.id}
              concertTitle={concert.title}
              className="min-h-[360px]"
              feeLabel={concert.feeLabel}
              feeNote={concert.feeNote}
              hostNote={concert.hostNote}
              statusBadge={concert.statusBadge}
              ticketPrice={concert.ticketPrice}
              ticketOpen={concert.ticketOpen}
              mapUrl={concert.bookingUrl}
              concertDate={concert.date}
              showReserveButton
            />

            {primaryBook ? (
              <section className="flex min-h-0 flex-col overflow-hidden border border-[#722f37]/18 bg-white p-5">
                <div className="flex items-start justify-between gap-3 border-b border-[#722f37]/10 pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#722f37]">
                      Featured Book
                    </p>
                    <h2 className="mt-2 break-keep text-xl font-bold tracking-tight text-[#201714]">
                      이번 북콘서트 도서
                    </h2>
                  </div>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 overflow-hidden">
                    <div className="mb-4 flex gap-4 border border-[#722f37]/10 bg-[#f7f3ee] p-4">
                      <Link href={`/books/${primaryBook.slug}`} className="relative block aspect-[2/3] w-[80px] shrink-0 overflow-hidden border border-[#722f37]/10 bg-white sm:w-[96px]">
                        {primaryBook.coverImage ? (
                          <Image
                            src={primaryBook.coverImage}
                            alt={primaryBook.title}
                            fill
                            className="object-cover"
                            sizes="96px"
                          />
                        ) : null}
                      </Link>
                      <div className="min-w-0">
                        <Link href={`/books/${primaryBook.slug}`} className="break-keep block text-base font-semibold leading-snug text-[#201714] sm:text-lg sm:leading-7">
                          {primaryBook.title}
                        </Link>
                        <p className="mt-1 text-sm text-[#62514a]">{primaryBook.author}</p>
                        {primaryBook.publisher ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{primaryBook.publisher}</p>
                        ) : null}
                        {primaryBook.description ? (
                          <p className="mt-3 break-keep text-sm leading-6 text-[#5f4a42] line-clamp-1">
                            {primaryBook.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-dashed border-[#722f37]/12 pt-4">
                    <FeaturedBookActions
                      isbn={primaryBook.isbn}
                      title={primaryBook.title}
                      price={primaryBook.salePrice}
                    />
                  </div>
                </div>
              </section>
            ) : (
              <div className="relative min-h-[160px] overflow-hidden border border-[#722f37]/10 bg-[#e9dfd2]">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(0deg, rgba(32,23,20,0.72), rgba(32,23,20,0.18)), repeating-linear-gradient(90deg, rgba(114,47,55,0.16) 0 18px, rgba(251,248,243,0.18) 18px 26px, rgba(104,79,69,0.2) 26px 48px, rgba(247,243,238,0.18) 48px 60px)',
                  }}
                />
                <div className="relative z-10 flex h-full flex-col justify-end p-6 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Book Concert</p>
                  <p className="mt-3 break-keep text-sm leading-6 text-white/80">
                    이번 북콘서트의 도서 정보를 준비 중입니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mt-16">
          <StoreFooter />
        </div>
      </div>
    </main>
  );
}

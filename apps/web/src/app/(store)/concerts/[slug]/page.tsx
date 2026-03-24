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
      <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <Button variant="ghost" asChild>
            <Link href="/concerts">북콘서트</Link>
          </Button>
        </div>

        <section className="border-b border-[#2f241f]/10 pb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">
            Miok Seowon Book Concert
          </p>
          <h1 className="mt-4 font-myeongjo text-[32px] font-bold leading-[1.15] tracking-tight text-[#201714] sm:text-[44px]">
            {concert.title}
          </h1>
          <p className="mt-3 text-sm font-medium text-[#5c4741]">{formatConcertDate(concert.date)}</p>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.94fr)_360px] xl:grid-cols-[minmax(0,0.98fr)_380px]">
          <div className="overflow-hidden border border-[#2f241f]/10 bg-white">
            {concert.imageUrl ? (
              <Image
                src={concert.imageUrl}
                alt={concert.title}
                width={1200}
                height={900}
                sizes="(max-width: 1024px) 100vw, 760px"
                className="block h-auto max-h-[620px] w-full object-cover"
                priority
                unoptimized
              />
            ) : (
              <div className="aspect-[4/3] bg-[#efe4d5]" />
            )}
          </div>

          <div className="space-y-4">
            {primaryBook ? (
              <section className="border border-[#2f241f]/12 bg-white p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#722f37]">Featured Book</p>
                <div className="mt-4 grid grid-cols-[108px_1fr] gap-4">
                  <Link href={`/books/${primaryBook.slug}`} className="relative block aspect-[2/3] overflow-hidden bg-muted">
                    {primaryBook.coverImage ? (
                      <Image src={primaryBook.coverImage} alt={primaryBook.title} fill sizes="108px" className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/books/${primaryBook.slug}`} className="block text-lg font-bold leading-snug tracking-tight text-[#1e1715]">
                      {primaryBook.title}
                    </Link>
                    <p className="mt-1 text-sm text-[#5c4741]">{primaryBook.author}</p>
                    {primaryBook.publisher ? <p className="mt-1 text-xs text-muted-foreground">{primaryBook.publisher}</p> : null}
                    {primaryBook.description ? (
                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#4b3c37]">{primaryBook.description}</p>
                    ) : null}
                  </div>
                </div>
                <FeaturedBookActions
                  isbn={primaryBook.isbn}
                  title={primaryBook.title}
                  price={primaryBook.salePrice}
                />
              </section>
            ) : null}

            <ConcertPurchasePanel
              concertId={concert.id}
              concertTitle={concert.title}
              feeLabel={concert.feeLabel}
              feeNote={concert.feeNote}
              hostNote={concert.hostNote}
              statusBadge={concert.statusBadge}
              ticketPrice={concert.ticketPrice}
              ticketOpen={concert.ticketOpen}
              mapUrl={concert.bookingUrl}
              concertDate={concert.date}
              showReserveButton={!hideReserveButton}
            />
          </div>
        </section>

        <div className="mt-16">
          <StoreFooter />
        </div>
      </div>
    </main>
  );
}

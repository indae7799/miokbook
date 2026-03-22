import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

function parsePriceLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

interface BookCard {
  isbn: string;
  title: string;
  author: string;
  coverImage: string;
  slug: string;
  listPrice: number;
  salePrice: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const { data: concertRow, error } = await supabaseAdmin
      .from('concerts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (!concertRow || !concertRow.is_active) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const concert = mapConcertRow(concertRow);
    const effectiveTicketPrice = concert.ticketPrice > 0 ? concert.ticketPrice : parsePriceLabel(concert.feeLabel);
    let books: BookCard[] = [];

    if (concert.bookIsbns.length > 0) {
      const { data: bookRows, error: booksError } = await supabaseAdmin
        .from('books')
        .select('isbn, title, author, cover_image, slug, list_price, sale_price')
        .in('isbn', concert.bookIsbns);

      if (booksError) throw booksError;

      const byIsbn = new Map((bookRows ?? []).map((book) => [book.isbn, book]));
      books = concert.bookIsbns
        .map((isbn) => byIsbn.get(isbn))
        .filter((book): book is NonNullable<typeof book> => Boolean(book))
        .map((book) => ({
          isbn: book.isbn,
          title: book.title ?? '',
          author: book.author ?? '',
          coverImage: book.cover_image ?? '',
          slug: book.slug ?? '',
          listPrice: book.list_price ?? 0,
          salePrice: book.sale_price ?? 0,
        }));
    }

    return NextResponse.json({
      id: concert.id,
      title: concert.title,
      slug: concert.slug,
      isActive: concert.isActive,
      imageUrl: concert.imageUrl,
      tableRows: concert.tableRows,
      bookIsbns: concert.bookIsbns,
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
      ticketPrice: effectiveTicketPrice,
      ticketOpen: concert.ticketOpen || effectiveTicketPrice > 0,
      ticketSoldCount: concert.ticketSoldCount,
      date: concert.date,
      order: concert.order,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/store/concerts/[slug] GET]', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

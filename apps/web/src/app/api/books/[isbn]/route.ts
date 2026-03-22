import { NextResponse } from 'next/server';
import { getOrSet, TTL } from '@/lib/firestore-cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapBookRow } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

const CACHE_HEADER = { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ isbn: string }> }
) {
  try {
    const { isbn } = await params;
    if (!isbn || !/^(978|979)\d{10}$/.test(isbn)) {
      return NextResponse.json({ error: 'Invalid isbn' }, { status: 400 });
    }

    const data = await getOrSet('book', `book:${isbn}`, TTL.BOOK, async () => {
      const { data: book, error } = await supabaseAdmin
        .from('books')
        .select('*')
        .eq('isbn', isbn)
        .maybeSingle();

      if (error) throw error;
      return book ? mapBookRow(book, 0) : null;
    });

    if (!data) return NextResponse.json(null);
    return NextResponse.json(data, { headers: CACHE_HEADER });
  } catch (e) {
    console.error('[api/books/[isbn]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
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

    const { data: book, error } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('isbn', isbn)
      .maybeSingle();

    if (error) throw error;
    if (!book) return NextResponse.json(null);

    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .select('stock, reserved')
      .eq('isbn', isbn)
      .maybeSingle();

    if (inventoryError) throw inventoryError;
    const stock = Math.max(0, Number(inventory?.stock ?? 0) - Number(inventory?.reserved ?? 0));
    const data = mapBookRow(book, stock);

    return NextResponse.json(data, { headers: CACHE_HEADER });
  } catch (e) {
    console.error('[api/books/[isbn]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapBookRow, mapInventoryByIsbn } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: books, count, error } = await supabaseAdmin
      .from('books')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    const isbns = (books ?? []).map((book) => book.isbn);
    const { data: inventoryRows, error: inventoryError } = isbns.length === 0
      ? { data: [], error: null }
      : await supabaseAdmin.from('inventory').select('*').in('isbn', isbns);

    if (inventoryError) throw inventoryError;

    const stockByIsbn = mapInventoryByIsbn(inventoryRows ?? []);
    const items = (books ?? []).map((book) => mapBookRow(book, stockByIsbn[book.isbn] ?? 0));
    const totalCount = count ?? 0;

    return NextResponse.json({
      items,
      totalCount,
      page,
      pageSize,
      hasNext: page * pageSize < totalCount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin/books GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR', detail: msg }, { status: 500 });
  }
}

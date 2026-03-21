import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (!adminAuth || !supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

    const idToken = request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const pageSize = 50;
    const lowStock = url.searchParams.get('lowStock') === 'true';
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (lowStock) {
      const { data: invRows, count, error } = await supabaseAdmin
        .from('inventory')
        .select('isbn, stock, reserved, updated_at', { count: 'exact' })
        .lt('stock', 10)
        .order('stock', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('[admin/inventory GET] lowStock', error);
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
      }

      const isbns = (invRows ?? []).map((row) => row.isbn);
      const { data: books } = isbns.length > 0
        ? await supabaseAdmin.from('books').select('isbn, title, author, cover_image, status, sales_count').in('isbn', isbns)
        : { data: [] as Array<{ isbn: string; title: string; author: string; cover_image: string; status: string; sales_count: number }> };
      const bookMap = new Map((books ?? []).map((book) => [book.isbn, book]));

      const items = (invRows ?? []).map((row) => {
        const book = bookMap.get(row.isbn);
        return {
          isbn: row.isbn,
          title: book?.title ?? row.isbn,
          author: book?.author ?? '',
          coverImage: book?.cover_image ?? '',
          status: book?.status ?? 'on_sale',
          stock: Number(row.stock ?? 0),
          reserved: Number(row.reserved ?? 0),
          available: Math.max(0, Number(row.stock ?? 0) - Number(row.reserved ?? 0)),
          salesCount: Number(book?.sales_count ?? 0),
          updatedAt: row.updated_at ?? null,
        };
      });

      return NextResponse.json({ items, totalCount: count ?? 0, page, hasNext: page * pageSize < (count ?? 0) });
    }

    const { data: books, count, error } = await supabaseAdmin
      .from('books')
      .select('isbn, title, author, cover_image, status, sales_count', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[admin/inventory GET] books', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const isbns = (books ?? []).map((book) => book.isbn);
    const { data: invRows } = isbns.length > 0
      ? await supabaseAdmin.from('inventory').select('isbn, stock, reserved, updated_at').in('isbn', isbns)
      : { data: [] as Array<{ isbn: string; stock: number; reserved: number; updated_at: string }> };
    const invMap = new Map((invRows ?? []).map((row) => [row.isbn, row]));

    const items = (books ?? []).map((book) => {
      const inv = invMap.get(book.isbn);
      return {
        isbn: book.isbn,
        title: book.title ?? book.isbn,
        author: book.author ?? '',
        coverImage: book.cover_image ?? '',
        status: book.status ?? 'on_sale',
        stock: Number(inv?.stock ?? 0),
        reserved: Number(inv?.reserved ?? 0),
        available: Math.max(0, Number(inv?.stock ?? 0) - Number(inv?.reserved ?? 0)),
        salesCount: Number(book.sales_count ?? 0),
        updatedAt: inv?.updated_at ?? null,
      };
    });

    return NextResponse.json({ items, totalCount: count ?? 0, page, hasNext: page * pageSize < (count ?? 0) });
  } catch (e) {
    console.error('[admin/inventory GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

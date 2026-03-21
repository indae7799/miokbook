import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const STATUSES = ['on_sale', 'out_of_print', 'coming_soon', 'old_edition'] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ isbn: string }> }
) {
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

    const { isbn } = await params;
    if (!isbn) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const status = body.status as string | undefined;
    const stock = body.stock as number | undefined;

    const wantStatus = status && STATUSES.includes(status as (typeof STATUSES)[number]);
    const wantStock = typeof stock === 'number' && stock >= 0;
    if (!wantStatus && !wantStock) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    if (wantStatus) {
      const { error } = await supabaseAdmin
        .from('books')
        .update({ status: status!, updated_at: new Date().toISOString() })
        .eq('isbn', isbn);

      if (error) throw error;
    }

    if (wantStock) {
      const { data: inventoryRow, error: inventoryReadError } = await supabaseAdmin
        .from('inventory')
        .select('reserved')
        .eq('isbn', isbn)
        .maybeSingle();

      if (inventoryReadError) throw inventoryReadError;

      const { error } = await supabaseAdmin.from('inventory').upsert({
        isbn,
        stock: Math.floor(stock!),
        reserved: Number(inventoryRow?.reserved ?? 0),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/books PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ isbn: string }> }
) {
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

    const { isbn } = await params;
    if (!isbn) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('books').delete().eq('isbn', isbn);
    if (error) throw error;

    invalidateStoreBookListsAndHome();

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/books DELETE]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

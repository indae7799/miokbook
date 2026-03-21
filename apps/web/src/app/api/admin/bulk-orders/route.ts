import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

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
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { data, error } = await supabaseAdmin
      .from('bulk_orders')
      .select('id, organization, contact_name, phone, email, delivery_date, status, books, notes, created_at, quote, contract')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin/bulk-orders GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const items = (data ?? []).map((row) => {
      const contract =
        row.contract && typeof row.contract === 'object' && !Array.isArray(row.contract)
          ? (row.contract as Record<string, unknown>)
          : null;

      return {
        id: row.id,
        organization: row.organization ?? '',
        contactName: row.contact_name ?? '',
        phone: row.phone ?? '',
        email: row.email ?? '',
        deliveryDate: row.delivery_date ?? '',
        status: row.status ?? 'pending',
        books: Array.isArray(row.books) ? row.books : [],
        notes: row.notes ?? '',
        createdAt: row.created_at ?? null,
        quote: row.quote ?? null,
        contract: contract
          ? {
              signedByEul: Boolean(contract.signedByEul),
              signedAtEul: typeof contract.signedAtEul === 'string' ? contract.signedAtEul : null,
              eulName: typeof contract.eulName === 'string' ? contract.eulName : null,
            }
          : null,
      };
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error('[admin/bulk-orders GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

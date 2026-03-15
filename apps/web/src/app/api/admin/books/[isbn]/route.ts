import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
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

    const invSnap = await adminDb.doc(`inventory/${isbn}`).get();
    const currentReserved = invSnap.data()?.reserved ?? 0;
    await Promise.all([
      wantStatus ? adminDb.doc(`books/${isbn}`).update({ status: status!, updatedAt: new Date() }) : Promise.resolve(),
      wantStock
        ? adminDb.doc(`inventory/${isbn}`).set(
            { isbn, stock: Math.floor(stock!), reserved: currentReserved, updatedAt: new Date() },
            { merge: true }
          )
        : Promise.resolve(),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/books PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

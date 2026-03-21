import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { uid: string } }) {
  try {
    if (!adminAuth || !supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

    const idToken = request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const { uid } = params;

    const [userRecord, ordersResult] = await Promise.all([
      adminAuth.getUser(uid),
      supabaseAdmin
        .from('orders')
        .select('order_id, status, items, total_price, shipping_fee, created_at, paid_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (ordersResult.error) {
      console.error('[admin/customers/[uid] GET] orders', ordersResult.error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const orders = (ordersResult.data ?? []).map((row) => ({
      id: row.order_id,
      orderId: row.order_id,
      status: row.status,
      items: Array.isArray(row.items) ? row.items : [],
      totalPrice: row.total_price,
      shippingFee: row.shipping_fee,
      createdAt: row.created_at ?? null,
      paidAt: row.paid_at ?? null,
    }));

    const totalSpent = orders
      .filter((order) => order.status === 'paid')
      .reduce((sum, order) => sum + Number(order.totalPrice ?? 0) + Number(order.shippingFee ?? 0), 0);

    return NextResponse.json({
      uid: userRecord.uid,
      email: userRecord.email ?? null,
      displayName: userRecord.displayName ?? null,
      photoURL: userRecord.photoURL ?? null,
      phoneNumber: userRecord.phoneNumber ?? null,
      createdAt: userRecord.metadata.creationTime ?? null,
      lastSignInAt: userRecord.metadata.lastSignInTime ?? null,
      disabled: userRecord.disabled,
      orders,
      totalSpent,
      orderCount: orders.filter((order) => order.status === 'paid').length,
    });
  } catch (e) {
    console.error('[admin/customers/[uid] GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { uid: string } }) {
  try {
    if (!adminAuth) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

    const idToken = request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const { uid } = params;
    const body = await request.json().catch(() => ({})) as { disabled?: boolean };

    if (typeof body.disabled === 'boolean') {
      await adminAuth.updateUser(uid, { disabled: body.disabled });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[admin/customers/[uid] PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

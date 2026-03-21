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
    const pageToken = url.searchParams.get('pageToken') ?? undefined;
    const maxResults = 50;

    const listResult = await adminAuth.listUsers(maxResults, pageToken);
    const users = listResult.users;

    if (users.length === 0) {
      return NextResponse.json({ users: [], nextPageToken: null });
    }

    const uids = users.map((user) => user.uid);
    const statsMap = new Map<string, { orderCount: number; totalSpent: number; lastOrderAt: string | null }>();

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('user_id, total_price, shipping_fee, paid_at, created_at')
      .in('user_id', uids)
      .eq('status', 'paid');

    for (const row of orders ?? []) {
      const uid = row.user_id;
      if (!uid) continue;
      const prev = statsMap.get(uid) ?? { orderCount: 0, totalSpent: 0, lastOrderAt: null };
      const amount = Number(row.total_price ?? 0) + Number(row.shipping_fee ?? 0);
      const orderDate = row.paid_at ?? row.created_at ?? null;
      statsMap.set(uid, {
        orderCount: prev.orderCount + 1,
        totalSpent: prev.totalSpent + amount,
        lastOrderAt: prev.lastOrderAt && orderDate && prev.lastOrderAt > orderDate ? prev.lastOrderAt : orderDate,
      });
    }

    const result = users.map((user) => {
      const stats = statsMap.get(user.uid) ?? { orderCount: 0, totalSpent: 0, lastOrderAt: null };
      return {
        uid: user.uid,
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        phoneNumber: user.phoneNumber ?? null,
        createdAt: user.metadata.creationTime ?? null,
        lastSignInAt: user.metadata.lastSignInTime ?? null,
        disabled: user.disabled,
        ...stats,
      };
    });

    return NextResponse.json({
      users: result,
      nextPageToken: listResult.pageToken ?? null,
    });
  } catch (e) {
    console.error('[admin/customers GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

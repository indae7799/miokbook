import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

const DEGRADED_MSG =
  '일부 데이터를 불러오지 못했습니다. Firestore 한도 초과·인덱스 미설정 등을 확인해 주세요.';

export async function GET(request: Request) {
  if (!adminAuth) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization');
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  let decoded: { role?: string };
  try {
    decoded = (await adminAuth.verifyIdToken(idToken)) as { role?: string };
  } catch (e) {
    console.warn('[admin/dashboard] verifyIdToken failed', e);
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (decoded.role !== 'admin') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }
  const db = adminDb;

  const todayStart = startOfToday();
  const sevenDaysAgo = startOfDaysAgo(6);
  let degraded = false;

  // ── 모든 쿼리 동시 실행 (순차 → 병렬) ────────────────────────────────────
  const dayKeys: Record<string, { orderCount: number; revenue: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = startOfDaysAgo(i);
    dayKeys[d.toISOString().slice(0, 10)] = { orderCount: 0, revenue: 0 };
  }

  const [
    paidTodayResult,
    recentOrdersResult,
    lowStockResult,
    returnCountResult,
    weeklyPaidResult,
  ] = await Promise.allSettled([
    // 1. 오늘 결제 완료
    db.collection('orders').where('status', '==', 'paid').where('paidAt', '>=', todayStart).get(),
    // 2. 최근 주문 5건
    db.collection('orders').orderBy('createdAt', 'desc').limit(5).get(),
    // 3. 재고 부족 목록
    db.collection('inventory').where('stock', '<', 5).orderBy('stock', 'asc').limit(10).get(),
    // 4. 반품 신청 수
    db.collection('orders').where('returnStatus', '==', 'requested').count().get(),
    // 5. 7일 매출
    db.collection('orders').where('status', '==', 'paid').where('paidAt', '>=', sevenDaysAgo).get(),
  ]);

  // ── 결과 처리 ──────────────────────────────────────────────────────────────
  let todayOrderCount = 0;
  let todayRevenue = 0;
  if (paidTodayResult.status === 'fulfilled') {
    paidTodayResult.value.docs.forEach((doc) => {
      const d = doc.data();
      todayOrderCount++;
      todayRevenue += (d.totalPrice ?? 0) + (d.shippingFee ?? 0);
    });
  } else {
    console.error('[dashboard] paidToday failed', paidTodayResult.reason);
    degraded = true;
  }

  let recentOrders: { id: string; orderId?: string; status?: string; totalPrice?: number; shippingFee?: number; createdAt: string | null }[] = [];
  if (recentOrdersResult.status === 'fulfilled') {
    recentOrders = recentOrdersResult.value.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        orderId: d.orderId,
        status: d.status,
        totalPrice: d.totalPrice,
        shippingFee: d.shippingFee,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });
  } else {
    console.error('[dashboard] recentOrders failed', recentOrdersResult.reason);
    degraded = true;
  }

  // 재고 부족 — 도서 제목을 같은 라운드트립에서 getAll로 조회
  let lowStockList: { isbn: string; stock: number; title?: string }[] = [];
  if (lowStockResult.status === 'fulfilled') {
    const rows: { isbn: string; stock: number; title?: string }[] = lowStockResult.value.docs.map((doc) => ({
      isbn: doc.id,
      stock: Number(doc.data().stock ?? 0),
    }));
    if (rows.length > 0) {
      try {
        const bookRefs = rows.map((r) => db.collection('books').doc(r.isbn));
        const bookSnaps = await db.getAll(...bookRefs);
        bookSnaps.forEach((snap, i) => {
          rows[i] = { ...rows[i], title: snap.exists ? snap.data()?.title : undefined };
        });
      } catch { /* 제목 없이 반환 */ }
    }
    lowStockList = rows;
  } else {
    console.error('[dashboard] lowStock failed', lowStockResult.reason);
    degraded = true;
  }

  let returnRequestedCount = 0;
  if (returnCountResult.status === 'fulfilled') {
    returnRequestedCount = returnCountResult.value.data().count;
  } else {
    degraded = true;
  }

  const dailyRevenue: { date: string; orderCount: number; revenue: number }[] = [];
  if (weeklyPaidResult.status === 'fulfilled') {
    weeklyPaidResult.value.docs.forEach((doc) => {
      const d = doc.data();
      const paidAt = d.paidAt?.toDate?.();
      if (!paidAt) return;
      const key = paidAt.toISOString().slice(0, 10);
      if (dayKeys[key]) {
        dayKeys[key].orderCount++;
        dayKeys[key].revenue += (d.totalPrice ?? 0) + (d.shippingFee ?? 0);
      }
    });
  } else {
    degraded = true;
  }
  Object.keys(dayKeys).sort().reverse().forEach((date) => {
    dailyRevenue.push({ date, orderCount: dayKeys[date].orderCount, revenue: dayKeys[date].revenue });
  });

  return NextResponse.json({
    todayOrderCount,
    todayRevenue,
    lowStockBooks: lowStockList,
    recentOrders,
    returnRequestedCount,
    dailyRevenue,
    degraded,
    ...(degraded ? { degradedMessage: DEGRADED_MSG } : {}),
  });
}

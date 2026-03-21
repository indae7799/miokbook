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
    const period = Math.min(90, Math.max(7, Number(url.searchParams.get('period') ?? '30')));

    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - period);
    from.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('items, total_price, shipping_fee, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', from.toISOString())
      .order('paid_at', { ascending: true });

    if (error) {
      console.error('[admin/analytics GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const dailyMap = new Map<string, { revenue: number; orderCount: number }>();
    let totalRevenue = 0;
    let totalOrders = 0;
    const isbnSalesMap = new Map<string, { quantity: number; revenue: number; title?: string }>();

    for (const row of data ?? []) {
      const paidAt = row.paid_at ? new Date(row.paid_at) : new Date();
      const dateKey = paidAt.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\.\s*/g, '-').replace(/-$/, '');
      const amount = Number(row.total_price ?? 0) + Number(row.shipping_fee ?? 0);

      const prev = dailyMap.get(dateKey) ?? { revenue: 0, orderCount: 0 };
      dailyMap.set(dateKey, { revenue: prev.revenue + amount, orderCount: prev.orderCount + 1 });

      totalRevenue += amount;
      totalOrders++;

      const items = Array.isArray(row.items) ? row.items : [];
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const book = item as Record<string, unknown>;
        const isbn = typeof book.isbn === 'string' ? book.isbn : '';
        if (!isbn) continue;
        const quantity = Number(book.quantity ?? 1);
        const salePrice = Number(book.salePrice ?? 0);
        const prev2 = isbnSalesMap.get(isbn) ?? { quantity: 0, revenue: 0 };
        isbnSalesMap.set(isbn, {
          quantity: prev2.quantity + quantity,
          revenue: prev2.revenue + salePrice * quantity,
          title: typeof book.title === 'string' ? book.title : prev2.title,
        });
      }
    }

    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const bestSellers = Array.from(isbnSalesMap.entries())
      .map(([isbn, value]) => ({ isbn, ...value }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    const missingTitles = bestSellers.filter((book) => !book.title).map((book) => book.isbn);
    if (missingTitles.length > 0) {
      const { data: books } = await supabaseAdmin
        .from('books')
        .select('isbn, title')
        .in('isbn', missingTitles);

      if (books) {
        const titleByIsbn = new Map(books.map((book) => [book.isbn, book.title]));
        for (const bestSeller of bestSellers) {
          if (!bestSeller.title) bestSeller.title = titleByIsbn.get(bestSeller.isbn) ?? bestSeller.isbn;
        }
      }
    }

    return NextResponse.json({
      period,
      totalRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      dailyRevenue,
      bestSellers,
    });
  } catch (e) {
    console.error('[admin/analytics GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

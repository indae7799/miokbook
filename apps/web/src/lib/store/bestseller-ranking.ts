import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUiDesignMode } from '@/lib/design-mode';
import { BOOK_LISTINGS_CACHE_TAG } from '@/lib/cache-tags';
import { shuffleCopy } from '@/lib/shuffle';

const SEOUL_TZ = 'Asia/Seoul';

/** 결제 완료·배송/교환 흐름 — 취소·실패·대기 제외 */
const COUNTABLE_ORDER_STATUSES = [
  'paid',
  'return_requested',
  'return_completed',
  'exchange_requested',
  'exchange_completed',
] as const;

export type WindowSales = { day: number; week: number; month: number };

export type BookPoolRowForRank = {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  cover_image: string;
  list_price: number;
  sale_price: number;
  sales_count: number;
};

/** 이번 달(서울) 누적이 이 값 이상이면 월·주·일·누적 순으로 정렬, 미만이면 셔플 구간 */
export const BESTSELLER_MONTHLY_MIN_FOR_RANK = 10;

function paidAtToSeoulYmd(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  return { y: y ?? 1970, m: m || 1, d: d || 1 };
}

function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const { y, m, d } = parseYmd(ymd);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  const y2 = base.getUTCFullYear();
  const m2 = base.getUTCMonth() + 1;
  const d2 = base.getUTCDate();
  return `${y2}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
}

function seoulMonthStartYmd(todayYmd: string): string {
  const { y, m } = parseYmd(todayYmd);
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function seoulTodayYmd(): string {
  return paidAtToSeoulYmd(new Date().toISOString());
}

type OrderItem = { type?: string; isbn?: string; quantity?: number };

async function fetchRecentCountableOrders(): Promise<Array<{ items: unknown; paid_at: string }>> {
  if (!supabaseAdmin) return [];
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 35);
  const sinceIso = since.toISOString();
  const out: Array<{ items: unknown; paid_at: string }> = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('items, paid_at')
      .not('paid_at', 'is', null)
      .in('status', [...COUNTABLE_ORDER_STATUSES])
      .gte('paid_at', sinceIso)
      .order('paid_at', { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('[bestseller-ranking] orders fetch', error.message);
      break;
    }
    if (!data?.length) break;
    out.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

function aggregateWindowSales(orders: Array<{ items: unknown; paid_at: string }>): Record<string, WindowSales> {
  const today = seoulTodayYmd();
  const weekStart = addCalendarDaysYmd(today, -6);
  const monthStart = seoulMonthStartYmd(today);
  const acc: Record<string, WindowSales> = {};

  const bump = (isbn: string, field: keyof WindowSales, qty: number) => {
    if (!acc[isbn]) acc[isbn] = { day: 0, week: 0, month: 0 };
    acc[isbn][field] += qty;
  };

  for (const row of orders) {
    const paidYmd = paidAtToSeoulYmd(row.paid_at);
    const items = Array.isArray(row.items) ? row.items : [];
    for (const raw of items) {
      const item = raw as OrderItem;
      if (item.type === 'concert_ticket') continue;
      const isbn = String(item.isbn ?? '').trim();
      if (!isbn) continue;
      const qty = Math.max(1, Math.min(10, Number(item.quantity) || 1));

      if (paidYmd === today) bump(isbn, 'day', qty);
      if (paidYmd >= weekStart && paidYmd <= today) bump(isbn, 'week', qty);
      if (paidYmd >= monthStart && paidYmd <= today) bump(isbn, 'month', qty);
    }
  }
  return acc;
}

async function buildWindowSalesRecordUncached(): Promise<Record<string, WindowSales>> {
  if (isUiDesignMode() || !supabaseAdmin) return {};
  try {
    const orders = await fetchRecentCountableOrders();
    return aggregateWindowSales(orders);
  } catch {
    return {};
  }
}

export const getWindowSalesRecordCached = unstable_cache(buildWindowSalesRecordUncached, ['store-bestseller-window-sales-v1'], {
  tags: [BOOK_LISTINGS_CACHE_TAG],
  revalidate: 60,
});

/**
 * 월간(서울 달력) ≥ monthMinForRank 권이면 월간→주간→일간→누적(sales_count) 내림차순,
 * 그 미만은 뒤에서 무작위. (동일 키는 isbn으로 안정 정렬)
 */
export function rankBestsellerPoolRows(
  pool: BookPoolRowForRank[],
  salesByIsbn: Record<string, WindowSales>,
  outLimit: number,
  monthMinForRank: number = BESTSELLER_MONTHLY_MIN_FOR_RANK,
): BookPoolRowForRank[] {
  const enriched = pool.map((row) => {
    const w = salesByIsbn[row.isbn] ?? { day: 0, week: 0, month: 0 };
    const sc = Number(row.sales_count ?? 0);
    return { row, w, sc };
  });

  const ranked = enriched.filter((x) => x.w.month >= monthMinForRank);
  const shuffleTier = enriched.filter((x) => x.w.month < monthMinForRank);

  ranked.sort((a, b) => {
    if (b.w.month !== a.w.month) return b.w.month - a.w.month;
    if (b.w.week !== a.w.week) return b.w.week - a.w.week;
    if (b.w.day !== a.w.day) return b.w.day - a.w.day;
    if (b.sc !== a.sc) return b.sc - a.sc;
    return a.row.isbn.localeCompare(b.row.isbn);
  });

  const shuffled = shuffleCopy(shuffleTier.map((x) => x.row));
  return [...ranked.map((x) => x.row), ...shuffled].slice(0, Math.max(0, outLimit));
}

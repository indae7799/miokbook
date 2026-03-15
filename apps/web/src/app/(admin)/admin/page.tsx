'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import EmptyState from '@/components/common/EmptyState';

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

interface DashboardData {
  todayOrderCount: number;
  todayRevenue: number;
  lowStockBooks: { isbn: string; stock: number; title?: string }[];
  recentOrders: {
    id: string;
    orderId?: string;
    status?: string;
    totalPrice?: number;
    shippingFee?: number;
    createdAt: string | null;
  }[];
}

async function fetchDashboard(token: string): Promise<DashboardData> {
  const res = await fetch('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchDashboard(token);
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="데이터를 불러올 수 없습니다"
        message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState title="데이터 없음" message="대시보드 데이터가 없습니다." />
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">대시보드</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">오늘 주문 수</h2>
          <p className="mt-2 text-3xl font-semibold">{data.todayOrderCount}건</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-muted-foreground">오늘 매출</h2>
          <p className="mt-2 text-3xl font-semibold">{formatPrice(data.todayRevenue)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">재고 부족 도서 (stock &lt; 5)</h2>
        {data.lowStockBooks.length === 0 ? (
          <p className="text-sm text-muted-foreground">재고 부족 도서가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {data.lowStockBooks.map((b) => (
              <li key={b.isbn} className="flex justify-between text-sm">
                <span>{b.title ?? b.isbn}</span>
                <span className="text-muted-foreground">재고 {b.stock}개</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">최근 주문 5건</h2>
        {data.recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground">최근 주문이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {data.recentOrders.map((o) => (
              <li
                key={o.id}
                className="flex justify-between items-center text-sm border-b border-border pb-2 last:border-0"
              >
                <span>{o.orderId ?? o.id}</span>
                <span>{o.status}</span>
                <span>
                  {formatPrice((o.totalPrice ?? 0) + (o.shippingFee ?? 0))}
                </span>
                <span className="text-muted-foreground">
                  {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ko-KR') : '-'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import EmptyState from '@/components/common/EmptyState';
import Link from 'next/link';

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

      {/* MVP 시작 가이드 — CSV 업로드·배너·CMS 순서 안내 */}
      <section className="rounded-lg border-2 border-primary/40 bg-primary/5 p-5">
        <h2 className="text-lg font-semibold mb-2">🚀 온라인 도서몰 MVP 설정 순서</h2>
        <p className="text-sm text-muted-foreground mb-4">
          아래 순서대로 진행하면 스토어 홈이 바로 사용 가능한 수준으로 채워집니다.
        </p>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <strong>도서 등록</strong> → <Link href="/admin/books" className="text-primary hover:underline">도서 관리</Link>에서 CSV/엑셀 업로드 (헤더: isbn, stock) 후 &apos;자료 수집&apos; 클릭. 알라딘 API로 도서 정보 자동 입력.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <strong>메인 배너</strong> → <Link href="/admin/marketing" className="text-primary hover:underline">배너/팝업</Link>에서 &apos;배너 추가&apos; 후 이미지 업로드·링크 입력·저장. 홈 상단 캐러셀에 노출됩니다.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <strong>추천·큐레이션</strong> → <Link href="/admin/cms" className="text-primary hover:underline">CMS</Link>에서 MD 추천 도서·이달의 책·테마 큐레이션 설정. 홈·큐레이션 페이지에 반영됩니다.
            </div>
          </li>
        </ol>
      </section>

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

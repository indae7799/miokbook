'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';

interface OrderRow {
  orderId: string;
  createdAt: string | null;
  shippingAddress?: {
    name?: string;
    phone?: string;
    zipCode?: string;
    address?: string;
    detailAddress?: string;
  };
}

async function fetchMyOrders(token: string): Promise<OrderRow[]> {
  const res = await fetch('/api/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function buildAddressKey(row: OrderRow): string {
  const addr = row.shippingAddress ?? {};
  return [addr.name, addr.phone, addr.zipCode, addr.address, addr.detailAddress].join('|');
}

export default function MypageAddressesPage() {
  const user = useAuthStore((s) => s.user);

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: queryKeys.orders.detail('addresses'),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchMyOrders(token);
    },
    enabled: !!user,
  });

  const addresses = orders
    .filter((row) => row.shippingAddress?.address)
    .reduce<Array<OrderRow>>((acc, row) => {
      const key = buildAddressKey(row);
      if (!acc.some((item) => buildAddressKey(item) === key)) {
        acc.push(row);
      }
      return acc;
    }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">최근 배송지</h1>
            <p className="mt-1 text-sm text-muted-foreground">최근 주문에서 사용한 배송지를 확인합니다.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/mypage">마이페이지로 돌아가기</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">불러오는 중...</div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error instanceof Error ? error.message : '배송지를 불러오지 못했습니다.'}
          </div>
        ) : addresses.length === 0 ? (
          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              title="저장된 배송지가 없습니다"
              message="주문을 완료하면 최근 배송지가 이곳에 표시됩니다."
            />
          </div>
        ) : (
          <div className="grid gap-4">
            {addresses.map((row) => {
              const addr = row.shippingAddress ?? {};
              return (
                <article key={buildAddressKey(row)} className="rounded-lg border border-border bg-card p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{addr.name || '수령인'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{addr.phone || '-'}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      최근 사용일 {row.createdAt?.slice(0, 10) ?? '-'}
                    </p>
                  </div>
                  <div className="mt-4 space-y-1 text-sm text-foreground">
                    <p>{addr.zipCode ? `(${addr.zipCode}) ` : ''}{addr.address || '-'}</p>
                    {addr.detailAddress && <p className="text-muted-foreground">{addr.detailAddress}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

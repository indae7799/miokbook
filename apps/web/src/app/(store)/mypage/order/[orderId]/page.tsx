'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';

interface OrderItem {
  type?: string;
  isbn?: string;
  concertId?: string;
  title?: string;
  quantity?: number;
  unitPrice?: number;
}

interface OrderRow {
  orderId: string;
  status: string;
  shippingStatus: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  items: OrderItem[];
  totalPrice: number;
  shippingFee: number;
  shippingAddress?: {
    name?: string;
    phone?: string;
    zipCode?: string;
    address?: string;
    detailAddress?: string;
  };
  createdAt: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
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

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export default function MypageOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const user = useAuthStore((s) => s.user);
  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : params?.orderId;

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: queryKeys.orders.detail(orderId ?? ''),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchMyOrders(token);
    },
    enabled: !!user && !!orderId,
  });

  const order = orders.find((row) => row.orderId === orderId);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">주문 상세</h1>
            <p className="mt-1 text-sm text-muted-foreground">주문 상태와 배송 정보를 확인합니다.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/mypage">마이페이지로 돌아가기</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">불러오는 중...</div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error instanceof Error ? error.message : '주문을 불러오지 못했습니다.'}
          </div>
        ) : !order ? (
          <div className="rounded-lg border border-border bg-card">
            <EmptyState
              title="주문을 찾을 수 없습니다"
              message="유효한 주문번호인지 다시 확인해 주세요."
            />
          </div>
        ) : (
          <>
            <section className="rounded-lg border border-border bg-card p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">주문번호</p>
                  <p className="font-mono text-foreground">{order.orderId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">주문일시</p>
                  <p className="text-foreground">{order.createdAt?.replace('T', ' ').slice(0, 16) ?? '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">주문상태</p>
                  <p className="text-foreground">{order.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">배송상태</p>
                  <p className="text-foreground">{order.shippingStatus}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">택배사</p>
                  <p className="text-foreground">{order.carrier || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">송장번호</p>
                  <p className="text-foreground">{order.trackingNumber || '-'}</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">배송지 정보</h2>
              <div className="space-y-1 text-sm text-foreground">
                <p>{order.shippingAddress?.name || '-'}</p>
                <p>{order.shippingAddress?.phone || '-'}</p>
                <p>
                  {order.shippingAddress?.zipCode ? `(${order.shippingAddress.zipCode}) ` : ''}
                  {order.shippingAddress?.address || '-'}
                </p>
                {order.shippingAddress?.detailAddress && (
                  <p className="text-muted-foreground">{order.shippingAddress.detailAddress}</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">주문 품목</h2>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={`${item.isbn ?? item.concertId ?? index}-${index}`} className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{item.title || item.isbn || item.concertId}</p>
                      <p className="mt-1 text-sm text-muted-foreground">수량 {item.quantity ?? 1}권</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-foreground">
                      {formatPrice((item.unitPrice ?? 0) * (item.quantity ?? 1))}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">상품 금액</span>
                  <span>{formatPrice(order.totalPrice)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">배송비</span>
                  <span>{formatPrice(order.shippingFee)}</span>
                </div>
                <div className="mt-2 flex justify-between text-base font-semibold">
                  <span>총 결제 금액</span>
                  <span>{formatPrice(order.totalPrice + order.shippingFee)}</span>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

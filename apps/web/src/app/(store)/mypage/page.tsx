'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface OrderRow {
  id: string;
  orderId: string;
  status: string;
  shippingStatus: string;
  items: { title?: string; quantity?: number; unitPrice?: number }[];
  totalPrice: number;
  shippingFee: number;
  createdAt: string | null;
  deliveredAt: string | null;
  returnStatus: string;
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

/** deliveredAt 기준 7일 이내인지 */
function isWithinReturnPeriod(deliveredAt: string | null): boolean {
  if (!deliveredAt) return false;
  const d = new Date(deliveredAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export default function MypagePage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list(user?.uid ?? ''),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchMyOrders(token);
    },
    enabled: !!user?.uid,
  });

  const canCancel = (o: OrderRow) => o.status === 'paid' && o.shippingStatus === 'ready';
  const canReturn = (o: OrderRow) =>
    o.status === 'paid' &&
    o.shippingStatus === 'delivered' &&
    o.returnStatus !== 'requested' &&
    o.returnStatus !== 'completed' &&
    isWithinReturnPeriod(o.deliveredAt);

  const handleCancel = async (orderId: string) => {
    if (!user) return;
    setCancellingId(orderId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/order/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, cancelReason: '고객 요청 취소' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(user.uid) });
      } else {
        alert(data.error || '취소에 실패했습니다.');
      }
    } catch {
      alert('취소 요청 중 오류가 발생했습니다.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReturnRequest = async (orderId: string) => {
    if (!user) return;
    setReturningId(orderId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/order/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, returnReason: '고객 요청 반품' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(user.uid) });
      } else {
        alert(data.error || '반품 신청에 실패했습니다.');
      }
    } catch {
      alert('반품 신청 중 오류가 발생했습니다.');
    } finally {
      setReturningId(null);
    }
  };

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
        title="주문 목록을 불러올 수 없습니다"
        message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
      />
    );
  }

  return (
    <main className="min-h-screen py-6">
      <h1 className="text-2xl font-semibold mb-6">마이페이지</h1>

      <section>
        <h2 className="text-lg font-medium mb-3">주문 목록</h2>
        {orders.length === 0 ? (
          <EmptyState
            title="주문 내역이 없습니다"
            message="주문한 도서가 여기에 표시됩니다."
          />
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-sm">{o.orderId}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {o.createdAt?.slice(0, 10)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {o.status === 'cancelled_by_customer' && (
                      <Badge variant="secondary">취소 완료</Badge>
                    )}
                    {o.status === 'return_requested' && (
                      <Badge variant="secondary">반품 신청 완료</Badge>
                    )}
                    {canCancel(o) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[48px]"
                        disabled={cancellingId === o.orderId}
                        onClick={() => handleCancel(o.orderId)}
                      >
                        {cancellingId === o.orderId ? '처리 중…' : '주문 취소'}
                      </Button>
                    )}
                    {canReturn(o) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[48px]"
                        disabled={returningId === o.orderId}
                        onClick={() => handleReturnRequest(o.orderId)}
                      >
                        {returningId === o.orderId ? '처리 중…' : '반품 신청'}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {o.items?.length ?? 0}종 · {formatPrice(o.totalPrice + o.shippingFee)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  상태: {o.status} / 배송: {o.shippingStatus}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

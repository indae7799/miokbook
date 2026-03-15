'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { useState } from 'react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<string, string> = {
  pending: '결제대기',
  paid: '결제완료',
  cancelled: '취소',
  failed: '결제실패',
  cancelled_by_customer: '고객취소',
  return_requested: '반품신청',
  return_completed: '반품완료',
};

const SHIPPING_LABELS: Record<string, string> = {
  ready: '배송준비',
  shipped: '배송중',
  delivered: '배송완료',
};

interface OrderRow {
  id: string;
  orderId: string;
  userId: string;
  status: string;
  shippingStatus: string;
  items: { title?: string; quantity?: number; unitPrice?: number }[];
  totalPrice: number;
  shippingFee: number;
  shippingAddress?: { name?: string; address?: string };
  createdAt: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
  returnStatus: string;
  returnReason: string | null;
}

async function fetchOrders(token: string, status?: string): Promise<OrderRow[]> {
  const url = status ? `/api/admin/orders?status=${encodeURIComponent(status)}` : '/api/admin/orders';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export default function AdminOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.orders(statusFilter || undefined),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchOrders(token, statusFilter || undefined);
    },
    enabled: !!user,
  });

  const patchMutation = useMutation({
    mutationFn: async ({
      orderId,
      shippingStatus,
      returnStatus,
    }: {
      orderId: string;
      shippingStatus?: string;
      returnStatus?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shippingStatus, returnStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders(statusFilter || undefined) });
      toast.success('반영되었습니다.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '처리 실패'),
  });

  const changeShipping = (orderId: string, next: 'shipped' | 'delivered') => {
    patchMutation.mutate({ orderId, shippingStatus: next });
  };
  const completeReturn = (orderId: string) => {
    patchMutation.mutate({ orderId, returnStatus: 'completed' });
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

  const returnRequested = orders.filter((o) => o.returnStatus === 'requested');

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">주문 관리</h1>

      {/* status 필터 */}
      <section className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">상태:</span>
        <Button
          variant={statusFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatusFilter('')}
          className="min-h-[40px]"
        >
          전체
        </Button>
        {['paid', 'return_requested', 'return_completed', 'pending', 'cancelled'].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="min-h-[40px]"
          >
            {STATUS_LABELS[s] ?? s}
          </Button>
        ))}
      </section>

      {/* 반품 신청 목록 */}
      {returnRequested.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-medium mb-3">반품 신청 ({returnRequested.length}건)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2">주문번호</th>
                  <th className="text-left p-2">사유</th>
                  <th className="text-left p-2">동작</th>
                </tr>
              </thead>
              <tbody>
                {returnRequested.map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="p-2 font-mono">{row.orderId}</td>
                    <td className="p-2">{row.returnReason || '-'}</td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        onClick={() => completeReturn(row.id)}
                        disabled={patchMutation.isPending}
                      >
                        반품 완료
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 주문 목록 */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">주문번호</th>
                <th className="text-left p-3 font-medium">상태</th>
                <th className="text-left p-3 font-medium">배송상태</th>
                <th className="text-left p-3 font-medium">금액</th>
                <th className="text-left p-3 font-medium">주문일</th>
                <th className="text-left p-3 font-medium">배송 변경</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    조건에 맞는 주문이 없습니다.
                  </td>
                </tr>
              ) : (
                orders.map((row) => (
                  <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{row.orderId}</td>
                    <td className="p-3">
                      <Badge variant="secondary">{STATUS_LABELS[row.status] ?? row.status}</Badge>
                      {row.returnStatus === 'requested' && (
                        <Badge variant="destructive" className="ml-1">반품신청</Badge>
                      )}
                    </td>
                    <td className="p-3">{SHIPPING_LABELS[row.shippingStatus] ?? row.shippingStatus}</td>
                    <td className="p-3">{formatPrice(row.totalPrice + row.shippingFee)}</td>
                    <td className="p-3 text-muted-foreground">{row.createdAt?.slice(0, 10) ?? '-'}</td>
                    <td className="p-3">
                      {row.status === 'paid' && row.shippingStatus === 'ready' && (
                        <Button size="sm" variant="outline" onClick={() => changeShipping(row.id, 'shipped')} disabled={patchMutation.isPending}>
                          배송중
                        </Button>
                      )}
                      {row.status === 'paid' && row.shippingStatus === 'shipped' && (
                        <Button size="sm" variant="outline" onClick={() => changeShipping(row.id, 'delivered')} disabled={patchMutation.isPending}>
                          배송완료
                        </Button>
                      )}
                      {row.status === 'paid' && row.shippingStatus === 'delivered' && (
                        <span className="text-muted-foreground">완료</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

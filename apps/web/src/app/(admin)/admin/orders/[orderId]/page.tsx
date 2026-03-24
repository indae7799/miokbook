'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/common/EmptyState';

const STATUS_LABELS: Record<string, string> = {
  pending: '결제대기',
  paid: '결제완료',
  cancelled: '취소',
  failed: '결제실패',
  cancelled_by_customer: '고객취소',
  return_requested: '반품요청',
  return_completed: '반품완료',
  exchange_requested: '교환요청',
  exchange_completed: '교환완료',
};

const SHIPPING_LABELS: Record<string, string> = {
  ready: '배송준비',
  shipped: '배송중',
  delivered: '배송완료',
};

interface OrderDetail {
  id: string;
  orderId: string;
  userId: string;
  status: string;
  shippingStatus: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  items: { title?: string; quantity?: number; unitPrice?: number }[];
  totalPrice: number;
  shippingFee: number;
  pointsUsed?: number;
  pointsEarned?: number;
  payableAmount?: number;
  deliveryMemo?: string;
  promotionCode?: string;
  promotionLabel?: string;
  promotionDiscount?: number;
  shippingAddress?: { name?: string; address?: string; phone?: string; detailAddress?: string };
  createdAt: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
  returnStatus: string;
  returnReason: string | null;
  exchangeReason?: string | null;
  adminLogs?: Array<{
    id: string;
    action: string;
    description: string;
    actorUid?: string | null;
    actorEmail?: string | null;
    actorName?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  }>;
}

interface PatchOrderPayload {
  orderId: string;
  shippingStatus?: string;
  returnStatus?: string;
  exchangeStatus?: string;
  trackingNumber?: string;
  carrier?: string;
}

async function fetchOrderDetail(token: string, orderId: string): Promise<OrderDetail> {
  const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
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

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildTimeline(detail: OrderDetail) {
  const events = [
    {
      key: 'created',
      title: '주문 접수',
      description: '주문이 생성되고 운영 목록에 반영되었습니다.',
      at: detail.createdAt,
    },
    detail.paidAt
      ? {
          key: 'paid',
          title: '결제 완료',
          description: '결제가 승인되어 주문 처리가 가능한 상태입니다.',
          at: detail.paidAt,
        }
      : null,
    detail.shippingStatus === 'shipped' || detail.shippingStatus === 'delivered'
      ? {
          key: 'shipped',
          title: '배송중',
          description: detail.trackingNumber
            ? `${detail.carrier || '택배사'} / ${detail.trackingNumber}`
            : '배송중으로 상태가 변경되었습니다.',
          at: detail.deliveredAt && detail.shippingStatus === 'delivered' ? detail.paidAt : detail.paidAt,
        }
      : null,
    detail.deliveredAt
      ? {
          key: 'delivered',
          title: '배송 완료',
          description: '배송 완료 처리되었습니다.',
          at: detail.deliveredAt,
        }
      : null,
    detail.returnStatus === 'requested'
      ? {
          key: 'return_requested',
          title: '반품 요청',
          description: detail.returnReason || '고객이 반품을 요청했습니다.',
          at: detail.createdAt,
        }
      : null,
    detail.status === 'return_completed'
      ? {
          key: 'return_completed',
          title: '반품 완료',
          description: '반품 처리가 완료되었습니다.',
          at: detail.deliveredAt || detail.createdAt,
        }
      : null,
    detail.status === 'exchange_requested'
      ? {
          key: 'exchange_requested',
          title: '교환 요청',
          description: detail.exchangeReason || '고객이 교환을 요청했습니다.',
          at: detail.createdAt,
        }
      : null,
    detail.status === 'exchange_completed'
      ? {
          key: 'exchange_completed',
          title: '교환 완료',
          description: '교환 처리가 완료되었습니다.',
          at: detail.deliveredAt || detail.createdAt,
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; title: string; description: string; at: string | null }>;

  return events;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = typeof params?.orderId === 'string' ? params.orderId : '';
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'order-detail', orderId],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchOrderDetail(token, orderId);
    },
    enabled: !!user && !!orderId,
  });

  useEffect(() => {
    setCarrier(data?.carrier ?? '');
    setTrackingNumber(data?.trackingNumber ?? '');
  }, [data?.carrier, data?.trackingNumber]);

  const patchMutation = useMutation({
    mutationFn: async (payload: PatchOrderPayload) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(payload.orderId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'order-detail', orderId] }),
      ]);
      toast.success('주문 정보가 반영되었습니다.');
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : '처리에 실패했습니다.');
    },
  });

  const saveTracking = async () => {
    if (!data) return;
    await patchMutation.mutateAsync({
      orderId: data.id,
      carrier,
      trackingNumber,
    });
  };

  const updateShipping = async (next: 'shipped' | 'delivered') => {
    if (!data) return;
    const payload: PatchOrderPayload = { orderId: data.id, shippingStatus: next };
    if (next === 'shipped') {
      payload.carrier = carrier;
      payload.trackingNumber = trackingNumber;
    }
    await patchMutation.mutateAsync(payload);
  };

  const completeReturn = async () => {
    if (!data) return;
    if (!window.confirm('반품 완료 처리하시겠습니까?')) return;
    await patchMutation.mutateAsync({ orderId: data.id, returnStatus: 'completed' });
  };

  const completeExchange = async () => {
    if (!data) return;
    if (!window.confirm('교환 완료 처리하시겠습니까?')) return;
    await patchMutation.mutateAsync({ orderId: data.id, exchangeStatus: 'completed' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="주문 정보를 불러올 수 없습니다"
        message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
      />
    );
  }

  if (!data) {
    return <EmptyState title="주문을 찾을 수 없습니다" message="유효한 주문번호인지 확인해 주세요." />;
  }

  const timeline = buildTimeline(data);

  return (
    <main className="space-y-5">
      <div className="border-b border-border pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">주문번호</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {data.orderId}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              주문 상태, 배송 처리, 프로모션 적용 내역을 이 페이지에서 직접 관리합니다.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/orders">주문 목록으로 돌아가기</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-3 border border-border bg-background p-4 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">주문상태</p>
          <div className="mt-2">
            <Badge variant="secondary">{STATUS_LABELS[data.status] ?? data.status}</Badge>
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">배송상태</p>
          <p className="mt-2 font-medium text-foreground">
            {SHIPPING_LABELS[data.shippingStatus] ?? data.shippingStatus}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">주문일</p>
          <p className="mt-2 font-medium text-foreground">{formatDateTime(data.createdAt)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">최종 결제 금액</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {formatPrice(Number(data.payableAmount ?? data.totalPrice + data.shippingFee))}
          </p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="border border-border bg-background p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">배송지 정보</h2>
            <div className="mt-4 space-y-1 text-sm">
              <p>{data.shippingAddress?.name ?? '-'}</p>
              <p className="text-muted-foreground">{data.shippingAddress?.phone ?? '-'}</p>
              <p className="text-muted-foreground">{data.shippingAddress?.address ?? '주소 정보 없음'}</p>
              {data.shippingAddress?.detailAddress ? (
                <p className="text-muted-foreground">{data.shippingAddress.detailAddress}</p>
              ) : null}
            </div>
            {data.deliveryMemo ? (
              <div className="mt-4 border-l-2 border-[#d8c4b2] bg-muted/20 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">배송 메모</p>
                <p className="mt-1 text-muted-foreground">{data.deliveryMemo}</p>
              </div>
            ) : null}
          </section>

          <section className="border border-border bg-background p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">주문 항목</h2>
            {data.items.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">항목 정보가 없습니다.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {data.items.map((item, index) => (
                  <li key={`${item.title ?? 'item'}-${index}`} className="flex items-center justify-between gap-4 py-3 text-sm">
                    <span>
                      {item.title ?? '도서'} x {item.quantity ?? 1}
                    </span>
                    <span>{formatPrice((item.unitPrice ?? 0) * (item.quantity ?? 1))}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-border bg-background p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">배송 처리</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">택배사</p>
                <Input value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="예: CJ대한통운" />
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">송장번호</p>
                <Input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="송장번호 입력" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void saveTracking()} disabled={patchMutation.isPending}>
                배송정보 저장
              </Button>
              {data.status === 'paid' && data.shippingStatus === 'ready' ? (
                <Button size="sm" onClick={() => void updateShipping('shipped')} disabled={patchMutation.isPending}>
                  배송중 처리
                </Button>
              ) : null}
              {data.status === 'paid' && data.shippingStatus === 'shipped' ? (
                <Button size="sm" variant="outline" onClick={() => void updateShipping('delivered')} disabled={patchMutation.isPending}>
                  배송완료 처리
                </Button>
              ) : null}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              배송중 처리 전 택배사와 송장번호가 올바른지 확인해 주세요.
            </p>
          </section>

          {data.returnStatus === 'requested' ? (
            <section className="border border-destructive/40 bg-destructive/5 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-destructive">반품 요청</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{data.returnReason || '사유 없음'}</p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => void completeReturn()} disabled={patchMutation.isPending}>
                  반품 완료 처리
                </Button>
              </div>
            </section>
          ) : null}

          {data.status === 'exchange_requested' ? (
            <section className="border border-blue-200 bg-blue-50/20 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-blue-900">교환 요청</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{data.exchangeReason || '사유 없음'}</p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => void completeExchange()} disabled={patchMutation.isPending}>
                  교환 완료 처리
                </Button>
              </div>
            </section>
          ) : null}

          <section className="border border-border bg-background p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">주문 이벤트</h2>
            <ol className="mt-4 space-y-4">
              {timeline.map((event, index) => (
                <li key={event.key} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <span className="size-2.5 rounded-full bg-[#722f37]" />
                    {index < timeline.length - 1 ? <span className="mt-2 h-full w-px bg-border" /> : null}
                  </div>
                  <div className="pb-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{event.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border border-border bg-background p-4 sm:p-5">
            <h2 className="text-base font-semibold text-foreground">관리자 처리 로그</h2>
            {data.adminLogs && data.adminLogs.length > 0 ? (
              <ul className="mt-4 divide-y divide-border border-y border-border">
                {data.adminLogs.map((log) => (
                  <li key={log.id} className="py-3 text-sm">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium text-foreground">{log.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</p>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {log.actorName || log.actorEmail || log.actorUid || '관리자'}가 처리했습니다.
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 ? (
                      <pre className="mt-2 overflow-x-auto bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">기록된 관리자 처리 로그가 없습니다.</p>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="border border-border bg-background">
            <div className="border-b border-border bg-muted/30 px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">결제 요약</h2>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">상품 금액</span>
                <span>{formatPrice(data.totalPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">배송비</span>
                <span>{formatPrice(data.shippingFee)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">프로모션</span>
                <span>{data.promotionLabel || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">프로모션 할인</span>
                <span>-{formatPrice(Number(data.promotionDiscount ?? 0))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">사용 마일리지</span>
                <span>-{formatPrice(Number(data.pointsUsed ?? 0))}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">적립 마일리지</span>
                <span>+{formatPrice(Number(data.pointsEarned ?? 0))}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between font-semibold">
                  <span>최종 결제 금액</span>
                  <span>{formatPrice(Number(data.payableAmount ?? data.totalPrice + data.shippingFee))}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-border bg-background p-4">
            <h2 className="text-sm font-semibold text-foreground">처리 메모</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <p>상태 변경 전 택배사와 송장번호를 먼저 저장하세요.</p>
              <p>반품과 교환 완료 처리는 주문 상태와 함께 운영 지표에 반영됩니다.</p>
              <p>프로모션 할인과 사용 마일리지는 최종 결제 금액 기준으로 검증하면 됩니다.</p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

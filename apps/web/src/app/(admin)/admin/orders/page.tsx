'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { queryKeys } from '@/lib/queryKeys';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

interface OrderRow {
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
}

interface OrdersResponse {
  items: OrderRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

interface PatchOrderPayload {
  orderId: string;
  shippingStatus?: string;
  returnStatus?: string;
  exchangeStatus?: string;
  trackingNumber?: string;
  carrier?: string;
}

async function fetchOrders(
  token: string,
  opts?: { status?: string; from?: string; to?: string; page?: number; pageSize?: number }
): Promise<OrdersResponse> {
  const params = new URLSearchParams();
  if (opts?.status) params.set('status', opts.status);
  if (opts?.from) params.set('from', opts.from);
  if (opts?.to) params.set('to', opts.to);
  if (opts?.page) params.set('page', String(opts.page));
  if (opts?.pageSize) params.set('pageSize', String(opts.pageSize));

  const url = params.toString() ? `/api/admin/orders?${params.toString()}` : '/api/admin/orders';
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

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  return value.slice(0, 10);
}

function getTrackingLabel(row: OrderRow): string {
  if (!row.carrier && !row.trackingNumber) return '-';
  return `${row.carrier || '택배사 미입력'} / ${row.trackingNumber || '송장번호 미입력'}`;
}

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('status') ?? '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detailOrder, setDetailOrder] = useState<OrderRow | null>(null);
  const [detailCarrier, setDetailCarrier] = useState('');
  const [detailTrackingNumber, setDetailTrackingNumber] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    setDetailCarrier(detailOrder?.carrier ?? '');
    setDetailTrackingNumber(detailOrder?.trackingNumber ?? '');
  }, [detailOrder]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.ordersPage(
      page,
      pageSize,
      statusFilter || undefined,
      dateFrom || undefined,
      dateTo || undefined
    ),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchOrders(token, {
        status: statusFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        page,
        pageSize,
      });
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  const orders = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNext = data?.hasNext ?? false;
  const returnRequested = orders.filter((order) => order.returnStatus === 'requested');
  const exchangeRequested = orders.filter((order) => order.status === 'exchange_requested');

  const patchMutation = useMutation({
    mutationFn: async (payload: PatchOrderPayload) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
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
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      toast.success('주문 정보가 반영되었습니다.');
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : '처리에 실패했습니다.');
    },
  });

  const updateDetailOrder = (updates: Partial<OrderRow>) => {
    setDetailOrder((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const saveTrackingInfo = async () => {
    if (!detailOrder) return;
    await patchMutation.mutateAsync({
      orderId: detailOrder.id,
      carrier: detailCarrier,
      trackingNumber: detailTrackingNumber,
    });
    updateDetailOrder({ carrier: detailCarrier, trackingNumber: detailTrackingNumber });
  };

  const changeShipping = async (order: OrderRow, next: 'shipped' | 'delivered') => {
    const payload: PatchOrderPayload = { orderId: order.id, shippingStatus: next };
    if (next === 'shipped') {
      payload.carrier = detailOrder?.id === order.id ? detailCarrier : (order.carrier ?? '');
      payload.trackingNumber =
        detailOrder?.id === order.id ? detailTrackingNumber : (order.trackingNumber ?? '');
    }

    await patchMutation.mutateAsync(payload);
    updateDetailOrder({
      shippingStatus: next,
      carrier: payload.carrier ?? detailOrder?.carrier ?? order.carrier ?? null,
      trackingNumber: payload.trackingNumber ?? detailOrder?.trackingNumber ?? order.trackingNumber ?? null,
      deliveredAt: next === 'delivered' ? new Date().toISOString() : detailOrder?.deliveredAt ?? order.deliveredAt,
    });
  };

  const completeReturn = async (orderId: string) => {
    await patchMutation.mutateAsync({ orderId, returnStatus: 'completed' });
    updateDetailOrder({ status: 'return_completed', returnStatus: 'completed' });
  };

  const completeExchange = async (orderId: string) => {
    await patchMutation.mutateAsync({ orderId, exchangeStatus: 'completed' });
    updateDetailOrder({ status: 'exchange_completed' });
  };

  const handleExportCsv = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const token = await getAdminToken(user);
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/orders/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('다운로드에 실패했습니다.');

      const isTruncated = res.headers.get('X-Export-Truncated') === 'true';
      const maxRows = res.headers.get('X-Export-Max') ?? '5000';
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `orders-export-${dateFrom || 'all'}-${dateTo || 'all'}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);

      if (isTruncated) {
        toast.warning(
          `최대 ${Number(maxRows).toLocaleString('ko-KR')}건까지만 내려받았습니다. 기간을 좁혀 다시 시도해 주세요.`
        );
      } else {
        toast.success('CSV 다운로드가 완료되었습니다.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '다운로드에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
    <main className="space-y-5">
      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">주문 관리</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          주문 상태, 배송 처리, 반품과 교환 요청, 프로모션 적용 내역을 한 화면에서 관리합니다.
        </p>
      </div>

      <section className="border border-border bg-background p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">기간</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="min-h-[40px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <span className="text-muted-foreground">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="min-h-[40px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">상태</span>
            <Button
              variant={statusFilter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter('');
                setPage(1);
              }}
            >
              전체
            </Button>
            {[
              'paid',
              'return_requested',
              'return_completed',
              'exchange_requested',
              'exchange_completed',
              'pending',
              'cancelled',
            ].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
              >
                {STATUS_LABELS[status] ?? status}
              </Button>
            ))}
          </div>

          <div className="lg:ml-auto">
            <Button variant="secondary" size="sm" onClick={handleExportCsv} disabled={exporting}>
              {exporting ? '다운로드 중...' : 'CSV 다운로드'}
            </Button>
          </div>
        </div>
      </section>

      {returnRequested.length > 0 ? (
        <section className="border border-red-200 bg-red-50/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-red-900">반품 요청</h2>
            <span className="text-sm text-red-700">{returnRequested.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-red-100">
                  <th className="px-3 py-2 text-left font-medium">주문번호</th>
                  <th className="px-3 py-2 text-left font-medium">사유</th>
                  <th className="px-3 py-2 text-left font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {returnRequested.map((row) => (
                  <tr key={row.id} className="border-b border-red-50">
                    <td className="px-3 py-3 font-mono text-xs">{row.orderId}</td>
                    <td className="px-3 py-3">{row.returnReason || '-'}</td>
                    <td className="px-3 py-3">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (window.confirm('반품 완료 처리하시겠습니까?')) void completeReturn(row.id);
                        }}
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
      ) : null}

      {exchangeRequested.length > 0 ? (
        <section className="border border-blue-200 bg-blue-50/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-blue-900">교환 요청</h2>
            <span className="text-sm text-blue-700">{exchangeRequested.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-blue-100">
                  <th className="px-3 py-2 text-left font-medium">주문번호</th>
                  <th className="px-3 py-2 text-left font-medium">사유</th>
                  <th className="px-3 py-2 text-left font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {exchangeRequested.map((row) => (
                  <tr key={row.id} className="border-b border-blue-50">
                    <td className="px-3 py-3 font-mono text-xs">{row.orderId}</td>
                    <td className="px-3 py-3">{row.exchangeReason || '-'}</td>
                    <td className="px-3 py-3">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          if (window.confirm('교환 완료 처리하시겠습니까?')) void completeExchange(row.id);
                        }}
                        disabled={patchMutation.isPending}
                      >
                        교환 완료
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-3 py-3 text-left font-medium">주문번호</th>
                <th className="px-3 py-3 text-left font-medium">상태</th>
                <th className="px-3 py-3 text-left font-medium">배송상태</th>
                <th className="px-3 py-3 text-left font-medium">배송정보</th>
                <th className="px-3 py-3 text-left font-medium">최종결제금액</th>
                <th className="px-3 py-3 text-left font-medium">프로모션</th>
                <th className="px-3 py-3 text-left font-medium">주문일</th>
                <th className="px-3 py-3 text-left font-medium">처리</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                    조건에 맞는 주문이 없습니다.
                  </td>
                </tr>
              ) : (
                orders.map((row) => (
                  <tr key={row.id} className="border-b border-border align-top hover:bg-muted/20">
                    <td className="px-3 py-3 font-mono text-xs">
                      <Link className="text-primary hover:underline" href={`/admin/orders/${row.orderId}`}>
                        {row.orderId}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="secondary">{STATUS_LABELS[row.status] ?? row.status}</Badge>
                    </td>
                    <td className="px-3 py-3">{SHIPPING_LABELS[row.shippingStatus] ?? row.shippingStatus}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{getTrackingLabel(row)}</td>
                    <td className="px-3 py-3 font-medium">
                      {formatPrice(Number(row.payableAmount ?? row.totalPrice + row.shippingFee))}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {row.promotionLabel
                        ? `${row.promotionLabel} / -${formatPrice(Number(row.promotionDiscount ?? 0))}`
                        : '-'}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/orders/${row.orderId}`}>상세</Link>
                        </Button>
                        {row.status === 'paid' && row.shippingStatus === 'ready' ? (
                          <Button size="sm" onClick={() => setDetailOrder(row)} disabled={patchMutation.isPending}>
                            배송중 처리
                          </Button>
                        ) : null}
                        {row.status === 'paid' && row.shippingStatus === 'shipped' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void changeShipping(row, 'delivered')}
                            disabled={patchMutation.isPending}
                          >
                            배송완료
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-muted-foreground">총 {totalCount.toLocaleString('ko-KR')}건</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
            >
              이전
            </Button>
            <span className="px-2 text-muted-foreground">{page}페이지</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={!hasNext}
            >
              다음
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={!!detailOrder} onOpenChange={(open) => !open && setDetailOrder(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto border border-border p-0">
          <DialogHeader className="border-b border-border px-5 py-4">
            <DialogTitle>주문 상세</DialogTitle>
          </DialogHeader>

          {detailOrder ? (
            <div className="space-y-5 px-5 py-5 text-sm">
              <section className="grid gap-3 border-b border-border pb-5 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">주문번호</p>
                  <p className="mt-1 font-mono">{detailOrder.orderId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">주문일</p>
                  <p className="mt-1">{formatDate(detailOrder.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">상태</p>
                  <div className="mt-1">
                    <Badge variant="secondary">{STATUS_LABELS[detailOrder.status] ?? detailOrder.status}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">배송상태</p>
                  <p className="mt-1">{SHIPPING_LABELS[detailOrder.shippingStatus] ?? detailOrder.shippingStatus}</p>
                </div>
              </section>

              <section className="space-y-2 border-b border-border pb-5">
                <h3 className="font-medium text-foreground">배송지 정보</h3>
                <p>{detailOrder.shippingAddress?.name ?? '-'}</p>
                <p className="text-muted-foreground">{detailOrder.shippingAddress?.phone ?? '-'}</p>
                <p className="text-muted-foreground">{detailOrder.shippingAddress?.address ?? '주소 정보 없음'}</p>
                {detailOrder.shippingAddress?.detailAddress ? (
                  <p className="text-muted-foreground">{detailOrder.shippingAddress.detailAddress}</p>
                ) : null}
                {detailOrder.deliveryMemo ? (
                  <div className="border-l-2 border-[#d8c4b2] bg-muted/20 px-3 py-2">
                    <p className="font-medium text-foreground">배송 메모</p>
                    <p className="mt-1 text-muted-foreground">{detailOrder.deliveryMemo}</p>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3 border-b border-border pb-5">
                <h3 className="font-medium text-foreground">프로모션 / 결제 요약</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">적용 프로모션</p>
                    <p className="mt-1">{detailOrder.promotionLabel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">프로모션 할인</p>
                    <p className="mt-1">-{formatPrice(Number(detailOrder.promotionDiscount ?? 0))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">사용 마일리지</p>
                    <p className="mt-1">-{formatPrice(Number(detailOrder.pointsUsed ?? 0))}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">적립 마일리지</p>
                    <p className="mt-1">+{formatPrice(Number(detailOrder.pointsEarned ?? 0))}</p>
                  </div>
                  <div className="sm:col-span-2 border-t border-border pt-3">
                    <p className="text-muted-foreground">최종 결제 금액</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatPrice(Number(detailOrder.payableAmount ?? detailOrder.totalPrice + detailOrder.shippingFee))}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3 border-b border-border pb-5">
                <h3 className="font-medium text-foreground">배송 처리</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-muted-foreground">택배사</p>
                    <Input
                      value={detailCarrier}
                      onChange={(e) => setDetailCarrier(e.target.value)}
                      placeholder="예: CJ대한통운"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-muted-foreground">송장번호</p>
                    <Input
                      value={detailTrackingNumber}
                      onChange={(e) => setDetailTrackingNumber(e.target.value)}
                      placeholder="송장번호 입력"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void saveTrackingInfo()} disabled={patchMutation.isPending}>
                    배송정보 저장
                  </Button>
                  {detailOrder.status === 'paid' && detailOrder.shippingStatus === 'ready' ? (
                    <Button size="sm" onClick={() => void changeShipping(detailOrder, 'shipped')} disabled={patchMutation.isPending}>
                      배송중 처리
                    </Button>
                  ) : null}
                  {detailOrder.status === 'paid' && detailOrder.shippingStatus === 'shipped' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void changeShipping(detailOrder, 'delivered')}
                      disabled={patchMutation.isPending}
                    >
                      배송완료 처리
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  배송중 처리 전 택배사와 송장번호가 올바르게 입력되었는지 확인하세요.
                </p>
              </section>

              <section className="space-y-3 border-b border-border pb-5">
                <h3 className="font-medium text-foreground">주문 항목</h3>
                {detailOrder.items.length === 0 ? (
                  <p className="text-muted-foreground">항목 정보가 없습니다.</p>
                ) : (
                  <ul className="divide-y divide-border border-y border-border">
                    {detailOrder.items.map((item, index) => (
                      <li key={`${item.title ?? 'item'}-${index}`} className="flex items-center justify-between gap-4 py-3">
                        <span>
                          {item.title ?? '도서'} x {item.quantity ?? 1}
                        </span>
                        <span>{formatPrice((item.unitPrice ?? 0) * (item.quantity ?? 1))}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span>상품 금액</span>
                    <span>{formatPrice(detailOrder.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>배송비</span>
                    <span>{formatPrice(detailOrder.shippingFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>프로모션 할인</span>
                    <span>-{formatPrice(Number(detailOrder.promotionDiscount ?? 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>사용 마일리지</span>
                    <span>-{formatPrice(Number(detailOrder.pointsUsed ?? 0))}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>최종 결제 금액</span>
                    <span>{formatPrice(Number(detailOrder.payableAmount ?? detailOrder.totalPrice + detailOrder.shippingFee))}</span>
                  </div>
                </div>
              </section>

              {detailOrder.returnStatus === 'requested' ? (
                <section className="border border-destructive/40 bg-destructive/5 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium text-destructive">반품 요청</p>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (window.confirm('반품 완료 처리하시겠습니까?')) void completeReturn(detailOrder.id);
                      }}
                      disabled={patchMutation.isPending}
                    >
                      반품 완료 처리
                    </Button>
                  </div>
                  <p className="text-muted-foreground">{detailOrder.returnReason || '사유 없음'}</p>
                </section>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="border-t border-border px-5 py-4">
            <Button variant="outline" onClick={() => setDetailOrder(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

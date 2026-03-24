'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CalendarClock, ChevronRight, Clock3, CreditCard, ExternalLink, Package, RotateCcw, Truck } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { DEFAULT_STORE_SETTINGS, type StoreSettings } from '@/lib/store-settings';
import EmptyState from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StoreFooter from '@/components/home/StoreFooter';

interface OrderRow {
  id: string;
  orderId: string;
  status: string;
  shippingStatus: string;
  trackingNumber?: string;
  carrier?: string;
  items: { type?: string; isbn?: string; slug?: string; concertId?: string; concertSlug?: string; title?: string; quantity?: number; unitPrice?: number; coverImage?: string }[];
  totalPrice: number;
  shippingFee: number;
  createdAt: string | null;
  deliveredAt: string | null;
  returnStatus: string;
}

async function fetchMyOrders(token: string): Promise<OrderRow[]> {
  const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function fetchStoreSettings(): Promise<StoreSettings> {
  const res = await fetch('/api/store/settings');
  if (!res.ok) return DEFAULT_STORE_SETTINGS;
  return res.json();
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR');
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-700">결제대기</Badge>;
    case 'paid':
      return <Badge className="bg-[#722f37] text-white hover:bg-[#722f37]">결제완료</Badge>;
    case 'cancelled':
    case 'cancelled_by_customer':
      return <Badge variant="destructive">주문취소</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="bg-gray-500 hover:bg-gray-500">결제실패</Badge>;
    case 'return_requested':
      return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">반품요청</Badge>;
    case 'return_completed':
      return <Badge variant="secondary">반품완료</Badge>;
    case 'exchange_requested':
      return <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700">교환요청</Badge>;
    case 'exchange_completed':
      return <Badge variant="secondary">교환완료</Badge>;
    case 'refunded':
      return <Badge variant="secondary">환불완료</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function ShippingBadge({ status }: { status: string }) {
  switch (status) {
    case 'ready':
      return <Badge variant="outline">배송준비중</Badge>;
    case 'shipped':
      return <Badge variant="outline" className="border-[#d8c4b2] bg-[#f7f1eb] text-[#6a4a3c]">배송중</Badge>;
    case 'delivered':
      return <Badge variant="secondary">배송완료</Badge>;
    default:
      return null;
  }
}

function isWithinReturnPeriod(deliveredAt: string | null, returnPeriodDays: number): boolean {
  if (!deliveredAt) return false;
  const d = new Date(deliveredAt);
  const now = new Date();
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) <= returnPeriodDays;
}

function getOrderItemLink(item?: OrderRow['items'][number]) {
  if (!item) return null;
  if (item.type === 'concert_ticket' && (item.concertSlug || item.concertId)) return `/concerts/${item.concertSlug || item.concertId}`;
  if (item.slug) return `/books/${item.slug}`;
  if (item.isbn) return `/books/${item.isbn}`;
  return null;
}

export default function MypagePage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);
  const { data: storeSettings = DEFAULT_STORE_SETTINGS } = useQuery({ queryKey: queryKeys.store.settings(), queryFn: fetchStoreSettings, staleTime: 5 * 60 * 1000 });
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
    o.status === 'paid' && o.shippingStatus === 'delivered' && o.returnStatus !== 'requested' && o.returnStatus !== 'completed' && isWithinReturnPeriod(o.deliveredAt, storeSettings.returnPeriodDays);

  const handleCancel = async (orderId: string) => {
    if (!user || !confirm('정말로 주문을 취소하시겠습니까?')) return;
    setCancellingId(orderId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/order/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, cancelReason: '고객 요청 취소' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) await queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(user.uid) });
      else alert(data.error || '취소에 실패했습니다.');
    } catch {
      alert('취소 요청 중 오류가 발생했습니다.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReturnRequest = async (orderId: string) => {
    if (!user || !confirm('반품 요청을 진행하시겠습니까?')) return;
    setReturningId(orderId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/order/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, returnReason: '고객 요청 반품' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) await queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(user.uid) });
      else alert(data.error || '반품 요청에 실패했습니다.');
    } catch {
      alert('반품 요청 중 오류가 발생했습니다.');
    } finally {
      setReturningId(null);
    }
  };

  if (isLoading) {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6f1eb] py-20"><div className="size-10 animate-spin rounded-full border-2 border-border border-t-[#722f37]" /><p className="text-sm text-muted-foreground">주문 정보를 불러오는 중입니다.</p></div>;
  }

  if (!user) {
    return (
      <>
        <div className="flex min-h-[60vh] flex-col items-center bg-[#f6f1eb] py-20">
          <AlertCircle className="mb-4 size-10 text-muted-foreground/40" />
          <h2 className="text-xl font-bold text-foreground">로그인이 필요합니다</h2>
          <p className="mt-2 mb-6 text-sm text-muted-foreground">마이페이지는 회원 전용 서비스입니다.</p>
          <Button asChild className="rounded text-white" style={{ backgroundColor: '#722f37' }}><Link href="/login">로그인하러 가기</Link></Button>
        </div>
        <StoreFooter />
      </>
    );
  }

  const statusCounts = {
    paid: orders.filter((o) => o.status === 'paid' && o.shippingStatus === 'ready').length,
    shipped: orders.filter((o) => o.status === 'paid' && o.shippingStatus === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'paid' && o.shippingStatus === 'delivered').length,
    cancelReturn: orders.filter((o) => o.status.includes('cancelled') || o.returnStatus === 'requested' || o.returnStatus === 'completed').length,
  };

  const statusSteps = [
    { label: '결제완료', count: statusCounts.paid, icon: CreditCard },
    { label: '배송중', count: statusCounts.shipped, icon: Truck },
    { label: '배송완료', count: statusCounts.delivered, icon: Package },
    { label: '취소·반품', count: statusCounts.cancelReturn, icon: RotateCcw },
  ];

  return (
    <>
      <main className="min-h-screen bg-[#f6f1eb]">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-14">
          {/* 상단 유저 정보 */}
          <section className="border-b border-[#d9c7b8] pb-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {user.displayName || user.email?.split('@')[0] || '회원'}님
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">전체 주문 {orders.length}건</span>
            </div>

            {/* 주문 현황 단계 */}
            <div className="mt-4 grid grid-cols-4 divide-x divide-[#d9c7b8] overflow-hidden rounded border border-[#d9c7b8] bg-white">
              {statusSteps.map(({ label, count, icon: Icon }) => (
                <div key={label} className="flex flex-col items-center gap-1 px-2 py-4 sm:flex-row sm:gap-3 sm:px-5">
                  <Icon className="size-4 shrink-0 text-[#722f37]" />
                  <div className="text-center sm:text-left">
                    <p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p>
                    <p className="text-lg font-bold leading-tight text-foreground sm:text-xl">{count}<span className="ml-0.5 text-xs font-normal text-muted-foreground">건</span></p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Clock3 className="size-4 text-[#722f37]" />최근 주문 내역</h2>
              <span className="text-sm text-muted-foreground">전체 {orders.length}건</span>
            </div>

            {error ? (
              <div className="border border-destructive/30 bg-background p-6 sm:p-8 text-sm text-destructive">{error instanceof Error ? error.message : '주문 내역을 불러오지 못했습니다.'}</div>
            ) : orders.length === 0 ? (
              <div className="border border-border/70 bg-background py-16">
                <EmptyState title="주문 내역이 아직 없습니다" message="온라인미옥의 도서를 둘러보고 첫 주문을 시작해 보세요." actionButton={{ label: '도서 보러 가기', onClick: () => router.push('/books') }} />
              </div>
            ) : (
              <div className="space-y-5">
                {orders.map((order) => {
                  const firstItem = order.items?.[0];
                  const totalQuantity = order.items?.reduce((acc, item) => acc + (item.quantity ?? 0), 0) ?? 0;
                  const itemLink = getOrderItemLink(firstItem);
                  const searchQuery = `${order.carrier ?? ''} ${order.trackingNumber ?? ''} 배송조회`;
                  return (
                    <article key={order.id} className="overflow-hidden border border-border/70 bg-background">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-[#fcfaf7] px-5 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-sm font-semibold text-foreground">{formatDate(order.createdAt)}</p>
                          <span className="text-sm text-muted-foreground">{order.orderId}</span>
                          <StatusBadge status={order.status} />
                          <ShippingBadge status={order.shippingStatus} />
                        </div>
                        <Button variant="outline" asChild className="rounded-md"><Link href={`/mypage/order/${order.orderId}`}>주문 상세<ChevronRight className="size-4" /></Link></Button>
                      </div>

                      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-6">
                        <div className="flex gap-4">
                          <div className="relative h-[112px] w-[84px] shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted">
                            {firstItem?.coverImage ? <Image src={firstItem.coverImage} alt={firstItem.title || ''} fill className="object-cover" sizes="84px" /> : <div className="flex h-full items-center justify-center"><Package className="size-6 text-muted-foreground/30" /></div>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">주문상품</Badge>
                              {order.shippingFee === 0 ? <Badge variant="secondary">무료배송</Badge> : null}
                            </div>
                            <h3 className="mt-3 text-lg font-semibold leading-7 text-foreground">{firstItem?.title || '이름 없는 상품'}{(order.items?.length ?? 0) > 1 ? <span className="ml-2 text-base font-normal text-muted-foreground">외 {order.items.length - 1}건</span> : null}</h3>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><CreditCard className="size-4" />{formatPrice(order.totalPrice + order.shippingFee)}</span>
                              <span className="flex items-center gap-1"><CalendarClock className="size-4" />총 {totalQuantity}권</span>
                              <span className="flex items-center gap-1"><Truck className="size-4" />{order.carrier ?? '택배사 미정'}</span>
                            </div>
                            {(order.shippingStatus === 'shipped' || order.shippingStatus === 'delivered') && order.trackingNumber ? (
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                                <span className="text-muted-foreground">송장번호 {order.trackingNumber}</span>
                                <a href={`https://search.naver.com/search.naver?query=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#722f37] hover:underline">배송조회<ExternalLink className="size-3" /></a>
                              </div>
                            ) : null}
                            {itemLink ? <div className="mt-3"><Link href={itemLink} className="text-sm font-medium text-[#722f37] hover:underline">상품 다시 보기</Link></div> : null}
                          </div>
                        </div>

                        <div className="space-y-3 border-l-2 border-[#d8c4b2] bg-[#fcfaf7] px-4 py-4">
                          <div className="border border-border/60 bg-white p-4"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Order Total</p><p className="mt-2 text-xl font-semibold text-foreground">{formatPrice(order.totalPrice + order.shippingFee)}</p></div>
                          <div className="grid gap-2">
                            {canCancel(order) ? <Button type="button" variant="outline" className="justify-center rounded-md border-red-200 text-red-600 hover:bg-red-50" disabled={cancellingId === order.orderId} onClick={() => handleCancel(order.orderId)}>{cancellingId === order.orderId ? '취소 처리 중...' : '주문 취소'}</Button> : null}
                            {canReturn(order) ? <Button type="button" variant="outline" className="justify-center rounded-md" disabled={returningId === order.orderId} onClick={() => handleReturnRequest(order.orderId)}>{returningId === order.orderId ? '반품 요청 중...' : '반품 요청'}</Button> : null}
                            <Button variant="outline" asChild className="justify-center rounded-md"><Link href={`/mypage/order/${order.orderId}`}>상세 페이지 열기</Link></Button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}

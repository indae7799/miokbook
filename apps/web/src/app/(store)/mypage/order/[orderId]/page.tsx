'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, ChevronRight, MapPin, Package, ShieldCheck, TicketPercent, Truck } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { Badge } from '@/components/ui/badge';
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
  pointsUsed?: number;
  pointsEarned?: number;
  payableAmount?: number;
  promotionLabel?: string;
  promotionDiscount?: number;
  deliveryMemo?: string;
  returnStatus?: string;
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
  const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'paid': return '결제완료';
    case 'cancelled':
    case 'cancelled_by_customer': return '주문취소';
    case 'failed': return '결제실패';
    case 'return_requested': return '반품요청';
    case 'return_completed': return '반품완료';
    case 'exchange_requested': return '교환요청';
    case 'exchange_completed': return '교환완료';
    default: return status;
  }
}

function getShippingLabel(status: string): string {
  switch (status) {
    case 'ready': return '배송준비중';
    case 'shipped': return '배송중';
    case 'delivered': return '배송완료';
    default: return status || '-';
  }
}

export default function MypageOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const user = useAuthStore((s) => s.user);
  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : params?.orderId;

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list(user?.uid ?? ''),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchMyOrders(token);
    },
    enabled: !!user && !!orderId,
  });

  const order = orders.find((row) => row.orderId === orderId);
  const payableAmount = Number(order?.payableAmount ?? ((order?.totalPrice ?? 0) + (order?.shippingFee ?? 0)));
  const pointsUsed = Number(order?.pointsUsed ?? 0);
  const pointsEarned = Number(order?.pointsEarned ?? 0);
  const promotionDiscount = Number(order?.promotionDiscount ?? 0);
  const deliveryMemo = order?.deliveryMemo?.trim() ?? '';

  return (
    <main className="min-h-screen bg-[#f6f1eb] px-4 py-8 pb-14">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden border-b border-[#d9c7b8] pb-8">
          <div className="grid gap-5 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6 lg:px-10">
            <div>
              <Badge className="bg-[#2e251f] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2e251f]">ORDER DETAIL</Badge>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:mt-5 sm:text-4xl">주문 상세</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">주문 상태, 배송 정보, 프로모션과 마일리지 적용 내역을 한 번에 확인할 수 있습니다.</p>
              {order ? (
                <div className="mt-7 grid gap-4 sm:grid-cols-3">
                  <div className="border border-[#d8c4b2] bg-[#f7f1eb] p-5"><p className="text-sm text-muted-foreground">주문번호</p><p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{order.orderId}</p></div>
                  <div className="border border-border/70 bg-[#fcfaf7] p-5"><p className="text-sm text-muted-foreground">주문상태</p><p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{getStatusLabel(order.status)}</p></div>
                  <div className="border border-border/70 bg-[#fcfaf7] p-5"><p className="text-sm text-muted-foreground">배송상태</p><p className="mt-2 text-lg font-semibold tracking-tight text-foreground">{getShippingLabel(order.shippingStatus)}</p></div>
                </div>
              ) : null}
            </div>
            <div className="flex items-start justify-end">
              <Button variant="outline" asChild className="rounded-md"><Link href="/mypage">마이페이지로 돌아가기<ChevronRight className="size-4" /></Link></Button>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="border border-border/70 bg-background p-6 sm:p-8 text-sm text-muted-foreground">주문 정보를 불러오는 중입니다.</div>
        ) : error ? (
          <div className="border border-destructive/30 bg-background p-6 sm:p-8 text-sm text-destructive">{error instanceof Error ? error.message : '주문 정보를 불러오지 못했습니다.'}</div>
        ) : !order ? (
          <div className="border border-border/70 bg-background"><EmptyState title="주문을 찾을 수 없습니다" message="유효한 주문번호인지 다시 확인해 주세요." /></div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
            <section className="space-y-6">
              <div className="border border-border/70 bg-background p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-2"><Package className="size-4 text-[#722f37]" /><h2 className="text-xl font-semibold tracking-tight text-foreground">주문 상품</h2></div>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={`${item.isbn ?? item.concertId ?? index}-${index}`} className="grid gap-4 border border-border/70 bg-[#fcfaf7] p-4 sm:grid-cols-[minmax(0,1fr)_120px]">
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-6 text-foreground">{item.title || item.isbn || item.concertId}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">수량 {item.quantity ?? 1}권</p>
                        <p className="text-sm leading-6 text-muted-foreground">판매가 {formatPrice(item.unitPrice ?? 0)}</p>
                      </div>
                      <div className="border border-border/60 bg-white p-4 text-right"><p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Subtotal</p><p className="mt-2 text-lg font-semibold text-foreground">{formatPrice((item.unitPrice ?? 0) * (item.quantity ?? 1))}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
                <div className="border border-border/70 bg-background p-5 sm:p-7">
                  <div className="mb-5 flex items-center gap-2"><MapPin className="size-4 text-[#722f37]" /><h2 className="text-xl font-semibold tracking-tight text-foreground">배송지 정보</h2></div>
                  <div className="border-l-2 border-[#d8c4b2] bg-[#fcfaf7] px-4 py-4 text-sm leading-7 text-foreground">
                    <p className="font-semibold">{order.shippingAddress?.name || '-'}</p>
                    <p>{order.shippingAddress?.phone || '-'}</p>
                    <p>{order.shippingAddress?.zipCode ? `(${order.shippingAddress.zipCode}) ` : ''}{order.shippingAddress?.address || '-'}</p>
                    {order.shippingAddress?.detailAddress ? <p className="text-muted-foreground">{order.shippingAddress.detailAddress}</p> : null}
                    {deliveryMemo ? <p className="pt-2 text-foreground">배송 메모: {deliveryMemo}</p> : null}
                  </div>
                </div>

                <div className="border border-border/70 bg-background p-5 sm:p-7">
                  <div className="mb-5 flex items-center gap-2"><TicketPercent className="size-4 text-[#722f37]" /><h2 className="text-xl font-semibold tracking-tight text-foreground">혜택 적용</h2></div>
                  <div className="border-l-2 border-[#d8c4b2] bg-[#fcfaf7] px-4 py-4 text-sm leading-7 text-foreground">
                    <p>프로모션: {order.promotionLabel || '적용 없음'}</p>
                    <p>프로모션 할인: -{formatPrice(promotionDiscount)}</p>
                    <p>사용 마일리지: -{formatPrice(pointsUsed)}</p>
                    <p>적립 마일리지: {formatPrice(pointsEarned)}</p>
                  </div>
                </div>
              </div>

              <div className="border border-border/70 bg-background p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-2"><Truck className="size-4 text-[#722f37]" /><h2 className="text-xl font-semibold tracking-tight text-foreground">배송 추적</h2></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="border border-border/70 bg-[#fcfaf7] p-5"><p className="text-sm text-muted-foreground">택배사</p><p className="mt-2 text-lg font-semibold text-foreground">{order.carrier || '-'}</p></div>
                  <div className="border border-border/70 bg-[#fcfaf7] p-5"><p className="text-sm text-muted-foreground">송장번호</p><p className="mt-2 text-lg font-semibold text-foreground">{order.trackingNumber || '-'}</p></div>
                </div>
              </div>
            </section>

            <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
              <div className="overflow-hidden border border-[#d9c7b8] bg-background">
                <div className="bg-[#2e251f] px-5 py-4 text-white sm:px-6 sm:py-5"><p className="text-xs uppercase tracking-[0.2em] text-white/65">Order Summary</p><p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{formatPrice(payableAmount)}</p></div>
                <div className="space-y-4 p-5 text-sm sm:p-6">
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">판매가</span><span className="font-medium text-foreground">{formatPrice(order.totalPrice)}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">배송비</span><span className="font-medium text-foreground">+ {formatPrice(order.shippingFee)}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">프로모션 할인</span><span className="font-medium text-[#722f37]">-{formatPrice(promotionDiscount)}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">마일리지 사용</span><span className="font-medium text-muted-foreground">-{formatPrice(pointsUsed)}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">프로모션</span><span className="font-medium text-foreground">{order.promotionLabel || '적용 없음'}</span></div>
                  <div className="bg-[#f7f1eb] p-4"><div className="flex items-center justify-between gap-4"><span className="font-semibold text-foreground">최종 결제 금액</span><span className="text-2xl font-semibold tracking-tight text-[#722f37]">{formatPrice(payableAmount)}</span></div><div className="mt-2 flex items-center justify-between gap-4"><span className="text-xs text-muted-foreground">적립 예정 마일리지</span><span className="text-sm font-medium text-foreground">{formatPrice(pointsEarned)}</span></div></div>
                </div>
              </div>

              <div className="border border-border/70 bg-background p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2"><CalendarClock className="size-4 text-[#722f37]" /><h3 className="font-semibold text-foreground">주문 타임라인</h3></div>
                <div className="space-y-4 text-sm">
                  <div className="border border-border/70 bg-[#fcfaf7] p-4"><p className="text-muted-foreground">주문 접수</p><p className="mt-1 font-medium text-foreground">{formatDateTime(order.createdAt)}</p></div>
                  <div className="border border-border/70 bg-[#fcfaf7] p-4"><p className="text-muted-foreground">결제 완료</p><p className="mt-1 font-medium text-foreground">{formatDateTime(order.paidAt)}</p></div>
                  <div className="border border-border/70 bg-[#fcfaf7] p-4"><p className="text-muted-foreground">배송 완료</p><p className="mt-1 font-medium text-foreground">{formatDateTime(order.deliveredAt)}</p></div>
                </div>
              </div>

              <div className="border border-border/70 bg-background p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2"><ShieldCheck className="size-4 text-[#722f37]" /><h3 className="font-semibold text-foreground">상태 안내</h3></div>
                <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                  <div className="border border-border/70 bg-[#fcfaf7] p-4">현재 주문 상태는 <span className="font-medium text-foreground">{getStatusLabel(order.status)}</span>입니다.</div>
                  <div className="border border-border/70 bg-[#fcfaf7] p-4">배송 상태는 <span className="font-medium text-foreground">{getShippingLabel(order.shippingStatus)}</span>입니다.</div>
                  {order.returnStatus && order.returnStatus !== 'none' ? (
                    <div className="border border-border/70 bg-[#fcfaf7] p-4">
                      반품 상태: <span className="font-medium text-foreground">
                        {order.returnStatus === 'requested' ? '반품 요청됨' : order.returnStatus === 'completed' ? '반품 완료' : order.returnStatus}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  <Button variant="outline" asChild className="w-full justify-between rounded-md"><Link href="/mypage">주문 목록으로 이동<ChevronRight className="size-4" /></Link></Button>
                  <Button variant="outline" asChild className="w-full justify-between rounded-md"><Link href="/books">도서 더 둘러보기<ChevronRight className="size-4" /></Link></Button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

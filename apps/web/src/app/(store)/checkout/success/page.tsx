'use client';

import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, MapPin, Package, TicketPercent, Truck } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { queryKeys } from '@/lib/queryKeys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { trackPurchase } from '@/lib/gtag';
import { cn } from '@/lib/utils';

interface OrderItem {
  type?: string;
  isbn?: string;
  concertId?: string;
  slug?: string;
  title?: string;
  coverImage?: string;
  quantity: number;
  unitPrice?: number;
}

interface OrderDetail {
  id: string;
  orderId: string;
  displayOrderId?: string;
  status: string;
  items: OrderItem[];
  totalPrice: number;
  shippingFee: number;
  pointsUsed?: number;
  pointsEarned?: number;
  payableAmount?: number;
  deliveryMemo?: string;
  promotionLabel?: string;
  promotionDiscount?: number;
  shippingAddress?: {
    name?: string;
    address?: string;
    detailAddress?: string;
  };
  createdAt: string | null;
  paidAt: string | null;
}

async function fetchMyOrders(token: string): Promise<OrderDetail[]> {
  const response = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatCard({
  icon,
  label,
  value,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: 'default' | 'accent';
}) {
  return (
    <div className={cn('border p-5', tone === 'accent' ? 'border-[#d8c4b2] bg-[#f7f1eb]' : 'border-border/70 bg-[#fcfaf7]')}>
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const clearCart = useCartStore((state) => state.clearCart);
  const clearDirectPurchase = useCartStore((state) => state.clearDirectPurchase);
  const orderId = searchParams.get('orderId');
  const displayOrderId = searchParams.get('displayOrderId');
  const paymentKey =
    searchParams.get('paymentKey') ??
    searchParams.get('imp_uid') ??
    searchParams.get('impUid') ??
    searchParams.get('paymentId');
  const errorCode = searchParams.get('code') ?? searchParams.get('error_code');
  const errorMessage = searchParams.get('message') ?? searchParams.get('error_msg');
  const provider = searchParams.get('provider') ?? 'toss';
  const mode = searchParams.get('mode');
  const isDirect = mode === 'direct';
  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmedRef = useRef(false);
  const purchaseTrackedRef = useRef(false);

  useEffect(() => {
    if (!errorCode && !errorMessage) return;
    const params = new URLSearchParams();
    if (orderId) params.set('orderId', orderId);
    if (displayOrderId) params.set('displayOrderId', displayOrderId);
    if (provider) params.set('provider', provider);
    if (mode) params.set('mode', mode);
    if (errorCode) params.set('code', errorCode);
    if (errorMessage) params.set('message', errorMessage);
    router.replace(`/checkout/fail?${params.toString()}`);
  }, [router, orderId, displayOrderId, provider, mode, errorCode, errorMessage]);

  useEffect(() => {
    if (!orderId || !paymentKey || errorCode || errorMessage || user || authLoading || confirmedRef.current) return;
    confirmedRef.current = true;
    setConfirmStatus('loading');

    fetch('/api/payment/guest-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, provider }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setConfirmStatus('success');
          if (isDirect) clearDirectPurchase();
          else clearCart();
        } else {
          setConfirmStatus('error');
          setConfirmError(data.error || '결제 확정에 실패했습니다.');
        }
      })
      .catch(() => {
        setConfirmStatus('error');
        setConfirmError('결제 확정 요청 중 오류가 발생했습니다.');
      });
  }, [orderId, paymentKey, provider, errorCode, errorMessage, user, authLoading, clearCart, clearDirectPurchase, isDirect]);

  useEffect(() => {
    if (!orderId || !paymentKey || errorCode || errorMessage || !user || confirmedRef.current) return;
    confirmedRef.current = true;
    setConfirmStatus('loading');

    user.getIdToken()
      .then((token) =>
        fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paymentKey, orderId, provider }),
        }),
      )
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setConfirmStatus('success');
          if (isDirect) clearDirectPurchase();
          else if (mode !== 'concert') clearCart();
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(user.uid) });
        } else {
          setConfirmStatus('error');
          setConfirmError(data.error || '결제 확정에 실패했습니다.');
        }
      })
      .catch(() => {
        setConfirmStatus('error');
        setConfirmError('결제 확정 요청 중 오류가 발생했습니다.');
      });
  }, [orderId, paymentKey, provider, errorCode, errorMessage, user, clearCart, clearDirectPurchase, isDirect, mode, queryClient]);

  const { data: ordersList = [] } = useQuery({
    queryKey: queryKeys.orders.list(user?.uid ?? ''),
    queryFn: async () => {
      if (!user) return [];
      const token = await user.getIdToken();
      return fetchMyOrders(token);
    },
    enabled: !!user?.uid && confirmStatus === 'success',
  });

  const order = orderId ? ordersList.find((entry) => entry.id === orderId) : null;
  const visibleOrderId = order?.displayOrderId ?? displayOrderId ?? orderId;
  const payableAmount = Number(order?.payableAmount ?? ((order?.totalPrice ?? 0) + (order?.shippingFee ?? 0)));
  const pointsUsed = Number(order?.pointsUsed ?? 0);
  const pointsEarned = Number(order?.pointsEarned ?? 0);
  const promotionDiscount = Number(order?.promotionDiscount ?? 0);
  const deliveryMemo = order?.deliveryMemo?.trim() ?? '';

  useEffect(() => {
    if (confirmStatus !== 'success' || !order || purchaseTrackedRef.current) return;
    purchaseTrackedRef.current = true;
    trackPurchase({
      transaction_id: order.orderId,
      value: payableAmount,
      items: order.items.map((item) => ({
        item_id: item.isbn ?? item.concertId ?? 'item',
        item_name: item.title ?? item.isbn ?? item.concertId ?? 'item',
        price: item.unitPrice ?? 0,
        quantity: item.quantity,
      })),
    });
  }, [confirmStatus, order, payableAmount]);

  if (!orderId || !paymentKey) {
    return (
      <main className="min-h-screen bg-[#f6f1eb] px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl border border-border/70 bg-background p-6 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">주문 정보를 찾을 수 없습니다.</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">결제 완료 페이지 접근에 필요한 주문번호 또는 결제키가 누락되었습니다.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link href="/">홈으로 이동</Link></Button>
            <Button variant="outline" asChild><Link href="/mypage">마이페이지에서 주문 확인</Link></Button>
          </div>
        </div>
      </main>
    );
  }

  if (confirmStatus === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f1eb] px-4 py-12">
        <div className="border border-[#e5d7cb] bg-background px-8 py-10 text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-2 border-border border-t-[#722f37]" />
          <p className="text-lg font-semibold text-foreground">결제를 확정하고 있습니다.</p>
          <p className="mt-2 text-sm text-muted-foreground">주문 정보를 안전하게 정리하는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (confirmStatus === 'error') {
    return (
      <main className="min-h-screen bg-[#f6f1eb] px-4 py-10 sm:py-12">
        <div className="mx-auto max-w-3xl border border-destructive/30 bg-background p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-destructive">결제 확정 실패</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{confirmError}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild><Link href="/mypage">마이페이지로 이동</Link></Button>
            <Button variant="outline" asChild><Link href="/checkout">결제 다시 시도</Link></Button>
          </div>
        </div>
      </main>
    );
  }

  if (!user && confirmStatus === 'success') {
    return (
      <main className="min-h-screen bg-[#f6f1eb] px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-xl space-y-5">
          <div className="border border-[#d9c7b8] bg-background p-7 sm:p-9">
            <Badge className="bg-[#2e251f] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2e251f]">ORDER COMPLETE</Badge>
            <div className="mt-6 flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center bg-[#722f37] text-white">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">결제가 완료되었습니다.</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">주문이 정상적으로 접수되었습니다.</p>
              </div>
            </div>
            <div className="mt-6 border-l-2 border-[#d8c4b2] bg-[#fcfaf7] px-4 py-4 text-sm leading-6 text-foreground">
              <p className="text-xs text-muted-foreground">주문번호</p>
              <p className="mt-1 font-mono font-semibold">{visibleOrderId}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">주문번호와 배송지 정보로 비회원 주문 조회를 계속할 수 있습니다.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button asChild className="rounded-md bg-[#722f37] text-white hover:bg-[#5d2630]">
                <Link href={`/guest-order?orderId=${orderId}`}>주문 조회하기</Link>
              </Button>
              <Button variant="outline" asChild className="rounded-md">
                <Link href="/books">쇼핑 계속하기</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f1eb] px-4 py-8 pb-14">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden border-b border-[#d9c7b8] pb-8">
          <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:px-10">
            <div>
              <Badge className="bg-[#2e251f] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2e251f]">ORDER COMPLETE</Badge>
              <div className="mt-5 flex items-start gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center bg-[#722f37] text-white">
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">결제가 완료되었습니다.</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                    주문이 정상적으로 접수되었습니다. 아래에서 주문번호와 배송 정보를 확인할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <StatCard icon={<Package className="size-4" />} label="주문번호" value={visibleOrderId ?? '-'} tone="accent" />
                <StatCard icon={<CreditCard className="size-4" />} label="결제금액" value={formatPrice(payableAmount)} />
                <StatCard icon={<Truck className="size-4" />} label="배송상태" value="결제 확인 완료" />
              </div>
            </div>
            <div className="flex items-end">
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-2">
                <Button variant="outline" asChild className="rounded-md">
                  <Link href="/books">쇼핑 계속하기</Link>
                </Button>
                <Button asChild className="rounded-md bg-[#722f37] text-white hover:bg-[#5d2630]">
                  <Link href={`/mypage/order/${orderId}`}>주문상세보기</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
          <section className="space-y-6">
            <div className="border border-border/70 bg-background p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">주문 내역</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">결제된 상품 구성입니다.</p>
                </div>
                {order?.paidAt ? <p className="text-sm text-muted-foreground">결제 시각 {formatDateTime(order.paidAt)}</p> : null}
              </div>
              {order ? (
                <ul className="mt-6 space-y-4">
                  {order.items.map((item, index) => (
                    <li
                      key={(item.isbn ?? item.concertId ?? 'item') + index}
                      className="grid gap-4 border border-border/70 bg-[#fcfaf7] p-4 sm:grid-cols-[84px_minmax(0,1fr)]"
                    >
                      <div className="relative aspect-[188/254] w-[84px] overflow-hidden rounded-md bg-muted">
                        {item.coverImage?.trim() ? (
                          <Image src={item.coverImage} alt={item.title ?? ''} fill sizes="84px" className="object-cover" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">ITEM</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-6 text-foreground">{item.title ?? item.isbn ?? item.concertId}</p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">판매가 {formatPrice(item.unitPrice ?? 0)}</p>
                        <p className="text-sm leading-6 text-muted-foreground">수량 {item.quantity}</p>
                        <p className="text-sm leading-6 text-muted-foreground">합계 {formatPrice((item.unitPrice ?? 0) * item.quantity)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">주문 상세 정보를 불러오는 중입니다.</p>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              <div className="border border-border/70 bg-background p-5 sm:p-7">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="size-4 text-[#722f37]" />
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">배송지 정보</h2>
                </div>
                <div className="border-l-2 border-[#d8c4b2] bg-[#fcfaf7] px-4 py-4 text-sm leading-7 text-foreground">
                  <p className="font-semibold">{order?.shippingAddress?.name || '-'}</p>
                  <p>{order?.shippingAddress?.address || '-'}</p>
                  {order?.shippingAddress?.detailAddress ? <p className="text-muted-foreground">{order.shippingAddress.detailAddress}</p> : null}
                  {deliveryMemo ? <p className="pt-2 text-foreground">배송 메모: {deliveryMemo}</p> : null}
                </div>
              </div>

              <div className="border border-border/70 bg-background p-5 sm:p-7">
                <div className="mb-4 flex items-center gap-2">
                  <TicketPercent className="size-4 text-[#722f37]" />
                  <h2 className="text-xl font-semibold tracking-tight text-foreground">혜택 반영</h2>
                </div>
                <div className="border-l-2 border-[#d8c4b2] bg-[#fcfaf7] px-4 py-4 text-sm leading-7 text-foreground">
                  <p>프로모션: {order?.promotionLabel || '적용 없음'}</p>
                  <p>프로모션 할인: -{formatPrice(promotionDiscount)}</p>
                  <p>사용 마일리지: -{formatPrice(pointsUsed)}</p>
                  <p>적립 마일리지: {formatPrice(pointsEarned)}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden border border-[#d9c7b8] bg-background">
              <div className="bg-[#2e251f] px-5 py-4 text-white sm:px-6 sm:py-5">
                <p className="text-xs uppercase tracking-[0.2em] text-white/65">Purchase Summary</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{formatPrice(payableAmount)}</p>
              </div>
              <div className="space-y-4 p-5 text-sm sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">상품 금액</span>
                  <span className="font-medium text-foreground">{formatPrice(Number(order?.totalPrice ?? 0))}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">배송비</span>
                  <span className="font-medium text-foreground">+ {formatPrice(Number(order?.shippingFee ?? 0))}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">프로모션 할인</span>
                  <span className="font-medium text-[#722f37]">-{formatPrice(promotionDiscount)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">마일리지 사용</span>
                  <span className="font-medium text-muted-foreground">-{formatPrice(pointsUsed)}</span>
                </div>
                <div className="bg-[#f7f1eb] p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-foreground">최종 결제 금액</span>
                    <span className="text-2xl font-semibold tracking-tight text-[#722f37]">{formatPrice(payableAmount)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">적립 예정 마일리지</span>
                    <span className="text-sm font-medium text-foreground">{formatPrice(pointsEarned)}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f6f1eb]" />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

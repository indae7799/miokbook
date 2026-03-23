'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { trackPurchase } from '@/lib/gtag';

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
  status: string;
  items: OrderItem[];
  totalPrice: number;
  shippingFee: number;
  pointsUsed?: number;
  pointsEarned?: number;
  payableAmount?: number;
  shippingAddress?: { name?: string; address?: string };
  createdAt: string | null;
  paidAt: string | null;
}

async function fetchMyOrders(token: string): Promise<OrderDetail[]> {
  const response = await fetch('/api/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function CheckoutSuccessContent() {
  useAuthGuard();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const clearCart = useCartStore((state) => state.clearCart);
  const clearDirectPurchase = useCartStore((state) => state.clearDirectPurchase);

  const orderId = searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const mode = searchParams.get('mode');
  const isDirect = mode === 'direct';

  const [confirmStatus, setConfirmStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const confirmedRef = useRef(false);
  const purchaseTrackedRef = useRef(false);

  useEffect(() => {
    if (!orderId || !paymentKey || !user || confirmedRef.current) return;
    confirmedRef.current = true;
    setConfirmStatus('loading');

    user.getIdToken().then((token) => {
      fetch('/api/payment/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentKey, orderId }),
      })
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
    });
  }, [orderId, paymentKey, user, clearCart, clearDirectPurchase, isDirect, mode, queryClient]);

  const { data: ordersList = [] } = useQuery({
    queryKey: queryKeys.orders.list(user?.uid ?? ''),
    queryFn: async () => {
      if (!user) return [];
      const token = await user.getIdToken();
      return fetchMyOrders(token);
    },
    enabled: !!user?.uid && confirmStatus === 'success',
  });

  const order = orderId ? ordersList.find((entry) => entry.orderId === orderId) : null;
  const isConcertOrder = Boolean(order && order.items.length > 0 && order.items.every((item) => item.type === 'concert_ticket'));

  useEffect(() => {
    if (confirmStatus !== 'success' || !order || purchaseTrackedRef.current) return;
    purchaseTrackedRef.current = true;
    const value = Number(order.payableAmount ?? ((order.totalPrice ?? 0) + (order.shippingFee ?? 0)));
    trackPurchase({
      transaction_id: order.orderId,
      value,
      items: (order.items ?? []).map((item: OrderItem) => ({
        item_id: item.isbn ?? item.concertId ?? 'item',
        item_name: item.title ?? item.isbn ?? item.concertId ?? 'item',
        price: item.unitPrice ?? 0,
        quantity: item.quantity,
      })),
    });
  }, [confirmStatus, order]);

  if (!orderId) {
    return (
      <main className="min-h-screen px-4 py-10">
        <p className="text-muted-foreground">주문 정보가 없습니다.</p>
        <Button asChild className="mt-4">
          <Link href="/">홈으로</Link>
        </Button>
      </main>
    );
  }

  if (confirmStatus === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
        <p className="text-muted-foreground">결제를 확정하는 중입니다.</p>
      </main>
    );
  }

  if (confirmStatus === 'error') {
    return (
      <main className="min-h-screen px-4 py-10">
        <h1 className="text-xl font-semibold text-destructive">결제 확정 실패</h1>
        <p className="mt-2 text-muted-foreground">{confirmError}</p>
        <Button asChild className="mt-4">
          <Link href="/mypage">마이페이지로 이동</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold">결제가 완료되었습니다.</h1>
        <p className="text-muted-foreground">주문번호: {orderId}</p>

        {order ? (
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 font-medium">주문 상품</h2>
            <ul className="space-y-3">
              {order.items?.map((item, index) => (
                <li key={(item.isbn ?? item.concertId ?? 'item') + index} className="flex gap-3">
                  {item.coverImage?.trim() ? (
                    <div className="relative aspect-[188/254] w-16 shrink-0 overflow-hidden rounded bg-muted">
                      <Image src={item.coverImage} alt={item.title ?? ''} fill sizes="64px" className="object-cover" />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title ?? item.isbn ?? item.concertId}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.unitPrice ?? 0)} x {item.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-border pt-3 font-medium">
              총 결제 금액 {formatPrice(Number(order.payableAmount ?? ((order.totalPrice ?? 0) + (order.shippingFee ?? 0))))}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              사용 마일리지 {formatPrice(Number(order.pointsUsed ?? 0))}
            </p>
            <p className="text-sm text-muted-foreground">
              적립 마일리지 {formatPrice(Number(order.pointsEarned ?? 0))}
            </p>
          </section>
        ) : null}

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/mypage">마이페이지에서 주문 확인</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={isConcertOrder ? '/concerts' : '/books'}>{isConcertOrder ? '북콘서트 보기' : '쇼핑 계속하기'}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">로딩 중...</div></main>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

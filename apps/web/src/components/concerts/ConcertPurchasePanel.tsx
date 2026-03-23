'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Minus, Plus, Ticket } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function loadTossScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (document.querySelector('script[src*="tosspayments.com"]')) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Toss script load failed'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        params: {
          amount: number;
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
        }
      ) => Promise<unknown>;
    };
  }
}

interface Props {
  concertId: string;
  concertTitle: string;
  concertSlug: string;
  feeLabel: string;
  feeNote: string;
  hostNote: string;
  statusBadge: string;
  ticketPrice: number;
  ticketOpen: boolean;
  mapUrl: string;
  className?: string;
}

export default function ConcertPurchasePanel({
  concertId,
  concertTitle,
  concertSlug,
  feeLabel,
  feeNote,
  hostNote,
  statusBadge,
  ticketPrice,
  ticketOpen,
  mapUrl,
  className = '',
}: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const totalPrice = useMemo(() => ticketPrice * quantity, [ticketPrice, quantity]);

  const handlePurchase = async () => {
    if (!ticketOpen || ticketPrice <= 0) return;
    if (!user) {
      router.push(`/login?redirect=/concerts/${concertSlug}`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/concert-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ concertId, quantity }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || '주문 생성에 실패했습니다.');
        return;
      }

      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) {
        setError('결제 설정이 완료되지 않았습니다.');
        return;
      }

      await loadTossScript();
      const TossPayments = window.TossPayments;
      if (!TossPayments) {
        setError('결제창을 불러오지 못했습니다.');
        return;
      }

      const origin = window.location.origin;
      const tossPayments = TossPayments(clientKey);
      await tossPayments.requestPayment('카드', {
        amount: totalPrice,
        orderId: data.orderId,
        orderName: `${concertTitle} 참가권 ${quantity}매`,
        successUrl: `${origin}/checkout/success?orderId=${data.orderId}&mode=concert`,
        failUrl: `${origin}/checkout/fail?orderId=${data.orderId}&mode=concert`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '결제 요청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className={`border border-[#722f37]/18 bg-white p-5 ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3 border-b border-[#722f37]/10 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#722f37]">Ticket</p>
        </div>
        {statusBadge ? (
          <span className="border border-[#722f37]/20 bg-[#f8f1f2] px-3 py-1 text-xs font-semibold text-[#722f37]">
            {statusBadge}
          </span>
        ) : null}
      </div>

      <div className="mt-4 border border-[#722f37]/10 bg-[#fcfaf8] p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-[#5f4a42]">참가권 금액</span>
          <span className="text-lg font-bold text-[#722f37]">{feeLabel || formatPrice(ticketPrice)}</span>
        </div>
        <p className="mt-2 text-sm text-[#5f4a42]">현장 결제 가능</p>
      </div>

      {ticketOpen && ticketPrice > 0 ? (
        <div className="mt-4 flex flex-1 flex-col justify-between space-y-4">
          <div className="border border-[#722f37]/10 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-foreground">수량</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="flex size-9 items-center justify-center border border-[#722f37]/14 text-foreground transition-colors hover:bg-[#f8f1f2]"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-8 text-center text-base font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.min(20, prev + 1))}
                  className="flex size-9 items-center justify-center border border-[#722f37]/14 text-foreground transition-colors hover:bg-[#f8f1f2]"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-[#722f37]/12 pt-3 text-sm">
              <span className="text-[#5f4a42]">총 결제 금액</span>
              <span className="text-xl font-bold text-[#722f37]">{formatPrice(totalPrice)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-12 rounded-none border-[#722f37]/20" asChild>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="mr-1 size-4" />
                예약 신청
              </a>
            </Button>
            <Button
              type="button"
              className="h-12 rounded-none bg-[#722f37] text-white hover:bg-[#5e2730]"
              disabled={submitting}
              onClick={handlePurchase}
            >
              <Ticket className="mr-1 size-4" />
              {submitting ? '결제 준비 중...' : '구매하기'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col justify-between space-y-3">
          <div className="border border-dashed border-[#722f37]/16 px-4 py-4 text-sm text-[#5f4a42]">
            참가권 판매가 아직 열리지 않았습니다.
          </div>
          {mapUrl ? (
            <Button type="button" variant="outline" className="h-12 w-full rounded-none border-[#722f37]/20" asChild>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="mr-1 size-4" />
                예약 신청
              </a>
            </Button>
          ) : null}
        </div>
      )}

      {error ? (
        <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </aside>
  );
}

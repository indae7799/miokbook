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
}

export default function ConcertPurchasePanel(props: Props) {
  const {
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
  } = props;
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
    <>
      <aside className="rounded-[28px] border border-[#722f37]/15 bg-[linear-gradient(180deg,#fffdf9_0%,#f7f0e8_100%)] p-6 shadow-[0_24px_80px_-36px_rgba(114,47,55,0.45)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#722f37]">Book Concert</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#241815]">{concertTitle}</h2>
          </div>
          {statusBadge ? (
            <span className="rounded-full bg-[#722f37] px-3 py-1 text-xs font-semibold text-white">{statusBadge}</span>
          ) : null}
        </div>

        <div className="mt-5 space-y-3 rounded-2xl border border-[#722f37]/10 bg-white/90 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">참가비</span>
            <span className="text-lg font-bold text-[#722f37]">{feeLabel || formatPrice(ticketPrice)}</span>
          </div>
          {feeNote ? <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{feeNote}</p> : null}
          {hostNote ? <p className="text-xs font-medium text-[#5f4a42]">{hostNote}</p> : null}
        </div>

        {ticketOpen && ticketPrice > 0 ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-border bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-foreground">구매 수량</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="min-w-8 text-center text-base font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.min(20, prev + 1))}
                    className="flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3 text-sm">
                <span className="text-muted-foreground">총 결제 금액</span>
                <span className="text-xl font-bold text-[#722f37]">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <Button
              type="button"
              className="h-12 w-full rounded-full bg-[#722f37] text-white hover:bg-[#5e2730]"
              disabled={submitting}
              onClick={handlePurchase}
            >
              <Ticket className="mr-1 size-4" />
              {submitting ? '결제 준비 중...' : '참가권 구매하기'}
            </Button>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-white/70 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
            온라인 참가권 결제가 아직 열리지 않았습니다.
          </div>
        )}

        <div className="mt-4">
          {mapUrl ? (
            <Button type="button" variant="outline" className="h-11 rounded-full" asChild>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="mr-1 size-4" />
                지도보기
              </a>
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </aside>

    </>
  );
}

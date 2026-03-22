'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuthStore } from '@/store/auth.store';
import { useCart } from '@/hooks/useCart';
import { ShippingAddressSchema } from '@online-miok/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/common/EmptyState';
import { MILEAGE_MAX_USE_RATIO, MILEAGE_MIN_USE, calculateMileageEarn } from '@/lib/mileage';

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

export default function CheckoutPage() {
  useAuthGuard();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [isDirect, setIsDirect] = useState(false);
  useEffect(() => {
    setIsDirect(new URLSearchParams(window.location.search).get('mode') === 'direct');
  }, []);

  const { items, enrichedItems, totalPrice, shippingFee } = useCart(isDirect);
  const [mileageBalance, setMileageBalance] = useState(0);
  const [pointsToUseInput, setPointsToUseInput] = useState('0');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    zipCode: '',
    address: '',
    detailAddress: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxPointsByPolicy = Math.min(mileageBalance, Math.floor(totalPrice * MILEAGE_MAX_USE_RATIO));
  const normalizedPointsToUse = Math.max(
    0,
    Math.min(maxPointsByPolicy, Math.floor(Number(pointsToUseInput.replace(/\D/g, '') || '0')))
  );
  const expectedMileageEarn = calculateMileageEarn(totalPrice);
  const totalAmount = totalPrice + shippingFee;
  const finalPayableAmount = Math.max(0, totalAmount - normalizedPointsToUse);

  const updateForm = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError(null);
  }, []);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) => {
      fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setMileageBalance(Math.max(0, Number(data.mileageBalance ?? 0)));
        })
        .catch(() => {});
    });
  }, [user]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormErrors({});
      setSubmitError(null);

      const parsed = ShippingAddressSchema.safeParse(form);
      if (!parsed.success) {
        const err: Record<string, string> = {};
        const fieldErrors = parsed.error.flatten().fieldErrors;
        if (fieldErrors) {
          Object.entries(fieldErrors).forEach(([k, v]) => {
            if (Array.isArray(v) && v[0]) err[k] = v[0];
          });
        }
        setFormErrors(err);
        return;
      }

      if (normalizedPointsToUse > 0 && normalizedPointsToUse < MILEAGE_MIN_USE) {
        setSubmitError(`마일리지는 ${formatPrice(MILEAGE_MIN_USE)}부터 사용할 수 있습니다.`);
        return;
      }

      if (!user) return;
      if (items.length === 0) {
        setSubmitError('장바구니가 비어 있습니다.');
        return;
      }

      setIsSubmitting(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/order/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: items.map((i) => ({ isbn: i.isbn, quantity: i.quantity })),
            shippingAddress: parsed.data,
            pointsToUse: normalizedPointsToUse,
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 409 && data.error === 'STOCK_SHORTAGE') {
          setSubmitError('일부 상품의 재고가 부족합니다.');
          setIsSubmitting(false);
          return;
        }
        if (!res.ok) {
          setSubmitError(data.error || res.statusText || '주문 생성에 실패했습니다.');
          setIsSubmitting(false);
          return;
        }

        const payAmount = Number(
          data.payableAmount ?? ((data.totalPrice ?? totalPrice) + (data.shippingFee ?? shippingFee))
        );
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

        if (!clientKey) {
          setSubmitError('결제 설정이 없습니다.');
          setIsSubmitting(false);
          return;
        }

        await loadTossScript();
        const TossPayments = window.TossPayments;
        if (!TossPayments) {
          setSubmitError('결제창을 불러올 수 없습니다.');
          setIsSubmitting(false);
          return;
        }

        const origin = window.location.origin;
        const orderName =
          enrichedItems.length === 0
            ? '도서'
            : enrichedItems.length === 1
              ? (enrichedItems[0].book?.title ?? '도서')
              : `${enrichedItems[0].book?.title ?? '도서'} 외 ${enrichedItems.length - 1}건`;

        const tossPayments = TossPayments(clientKey);
        await tossPayments.requestPayment('카드', {
          amount: payAmount,
          orderId: data.orderId,
          orderName: orderName.slice(0, 100),
          successUrl: `${origin}/checkout/success?orderId=${data.orderId}${isDirect ? '&mode=direct' : ''}`,
          failUrl: `${origin}/checkout/fail?orderId=${data.orderId}${isDirect ? '&mode=direct' : ''}`,
        });
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : '결제 요청 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, items, form, enrichedItems, totalPrice, shippingFee, normalizedPointsToUse, isDirect]
  );

  if (items.length === 0) {
    return (
      <main className="min-h-screen py-10">
        <EmptyState
          title="장바구니가 비어 있습니다"
          message="결제할 상품을 먼저 담아 주세요."
          actionButton={{
            label: '도서 목록 보기',
            onClick: () => router.push('/books'),
          }}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen py-6 pb-10">
      <h1 className="mb-6 text-2xl font-semibold">결제</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-medium">주문 상품</h2>
          <ul className="space-y-3 rounded-lg border border-border bg-card p-4">
            {enrichedItems.map((row) => (
              <li key={row.isbn} className="flex gap-3">
                <div className="relative aspect-[188/254] w-16 shrink-0 overflow-hidden rounded bg-muted">
                  {row.book?.coverImage ? (
                    <Image
                      src={row.book.coverImage}
                      alt={row.book.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                      -
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.book?.title ?? row.isbn}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(row.book?.salePrice ?? 0)} x {row.quantity} = {formatPrice(row.lineTotal)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-medium">배송 정보</h2>
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div>
              <label className="mb-1 block text-sm font-medium">받는 분 *</label>
              <Input value={form.name} onChange={(e) => updateForm('name', e.target.value)} />
              {formErrors.name ? <p className="mt-1 text-sm text-destructive">{formErrors.name}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">휴대폰 번호 *</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
              />
              {formErrors.phone ? <p className="mt-1 text-sm text-destructive">{formErrors.phone}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">우편번호 *</label>
              <Input
                value={form.zipCode}
                onChange={(e) => updateForm('zipCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
              />
              {formErrors.zipCode ? <p className="mt-1 text-sm text-destructive">{formErrors.zipCode}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">주소 *</label>
              <Input value={form.address} onChange={(e) => updateForm('address', e.target.value)} />
              {formErrors.address ? <p className="mt-1 text-sm text-destructive">{formErrors.address}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">상세 주소</label>
              <Input value={form.detailAddress} onChange={(e) => updateForm('detailAddress', e.target.value)} />
            </div>
          </div>
        </section>

        <section className="max-w-md rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-sm text-muted-foreground">
            보유 마일리지 <span className="float-right">{formatPrice(mileageBalance)}</span>
          </p>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">사용할 마일리지</label>
            <Input
              value={pointsToUseInput}
              onChange={(e) => setPointsToUseInput(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              최소 {formatPrice(MILEAGE_MIN_USE)}, 최대 {formatPrice(maxPointsByPolicy)} 사용 가능
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            상품 금액 <span className="float-right">{formatPrice(totalPrice)}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            배송비 <span className="float-right">{formatPrice(shippingFee)}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            마일리지 사용 <span className="float-right">-{formatPrice(normalizedPointsToUse)}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            예상 적립 <span className="float-right">{formatPrice(expectedMileageEarn)}</span>
          </p>
          <p className="mt-3 border-t border-border pt-3 font-semibold">
            총 결제 금액 <span className="float-right">{formatPrice(finalPayableAmount)}</span>
          </p>
        </section>

        {submitError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {submitError}
          </div>
        ) : null}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-h-12 flex-1 text-white font-bold"
            style={{ backgroundColor: '#722f37' }}
          >
            {isSubmitting ? '처리 중...' : `${formatPrice(finalPayableAmount)} 결제하기`}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/cart">장바구니로</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}

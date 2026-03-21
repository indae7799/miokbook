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
  
  // 클라이언트 사이드에서 query string을 읽어 단건 결제 모드 판단
  // (Next.js Suspense 제약을 피하기 위해 useEffect 사용)
  useEffect(() => {
    setIsDirect(new URLSearchParams(window.location.search).get('mode') === 'direct');
  }, []);

  const {
    items,
    enrichedItems,
    totalPrice,
    shippingFee,
  } = useCart(isDirect);

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

  const updateForm = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError(null);
  }, []);

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
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (res.status === 409 && (data.error === 'STOCK_SHORTAGE' || String(data.error).includes('STOCK_SHORTAGE'))) {
          setSubmitError('일부 상품의 재고가 부족합니다. 수량을 조정하거나 품절 상품을 제거한 뒤 다시 시도해 주세요.');
          setIsSubmitting(false);
          return;
        }
        if (!res.ok) {
          setSubmitError(data.error || res.statusText || '주문 생성에 실패했습니다.');
          setIsSubmitting(false);
          return;
        }

        const { orderId, totalPrice: orderTotal, shippingFee: orderShipping } = data;
        const payAmount = (orderTotal ?? totalPrice) + (orderShipping ?? shippingFee);
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

        if (!clientKey) {
          setSubmitError('결제 설정이 되어 있지 않습니다. 관리자에게 문의해 주세요.');
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
        const orderName = enrichedItems.length === 0
          ? '도서'
          : enrichedItems.length === 1
            ? (enrichedItems[0].book?.title ?? '도서')
            : `${enrichedItems[0].book?.title ?? '도서'} 외 ${enrichedItems.length - 1}건`;

        const tossPayments = TossPayments(clientKey);
        await tossPayments.requestPayment('카드', {
          amount: payAmount,
          orderId,
          orderName: orderName.slice(0, 100),
          successUrl: `${origin}/checkout/success?orderId=${orderId}${isDirect ? '&mode=direct' : ''}`,
          failUrl: `${origin}/checkout/fail?orderId=${orderId}${isDirect ? '&mode=direct' : ''}`,
        });
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : '결제 요청 중 오류가 발생했습니다.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [user, items, form, enrichedItems, totalPrice, shippingFee]
  );

  if (items.length === 0) {
    return (
      <main className="min-h-screen py-10">
        <EmptyState
          title="장바구니가 비어 있습니다"
          message="결제할 상품을 장바구니에 담아 주세요."
          actionButton={{
            label: '도서 목록 보기',
            onClick: () => router.push('/books'),
          }}
        />
      </main>
    );
  }

  const totalAmount = totalPrice + shippingFee;

  return (
    <main className="min-h-screen py-6 pb-10">
      <h1 className="text-2xl font-semibold mb-6">결제</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 주문 상품 요약 */}
        <section>
          <h2 className="text-lg font-medium mb-3">주문 상품</h2>
          <ul className="space-y-3 rounded-lg border border-border bg-card p-4">
            {enrichedItems.map((row) => (
              <li key={row.isbn} className="flex gap-3">
                <div className="relative aspect-[188/254] w-16 shrink-0 rounded overflow-hidden bg-muted">
                  {row.book?.coverImage ? (
                    <Image
                      src={row.book.coverImage}
                      alt={row.book.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                      -
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate text-sm">{row.book?.title ?? row.isbn}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(row.book?.salePrice ?? 0)} × {row.quantity} = {formatPrice(row.lineTotal)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 배송 정보 */}
        <section>
          <h2 className="text-lg font-medium mb-3">배송 정보</h2>
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">받는 분 *</label>
              <Input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="이름"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="text-sm text-destructive mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">휴대폰 번호 *</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="01012345678"
                aria-invalid={!!formErrors.phone}
              />
              {formErrors.phone && <p className="text-sm text-destructive mt-1">{formErrors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">우편번호 *</label>
              <Input
                value={form.zipCode}
                onChange={(e) => updateForm('zipCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="12345"
                aria-invalid={!!formErrors.zipCode}
              />
              {formErrors.zipCode && <p className="text-sm text-destructive mt-1">{formErrors.zipCode}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">주소 *</label>
              <Input
                value={form.address}
                onChange={(e) => updateForm('address', e.target.value)}
                placeholder="시/도, 시/구, 동"
                aria-invalid={!!formErrors.address}
              />
              {formErrors.address && <p className="text-sm text-destructive mt-1">{formErrors.address}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">상세 주소</label>
              <Input
                value={form.detailAddress}
                onChange={(e) => updateForm('detailAddress', e.target.value)}
                placeholder="상세 주소"
              />
            </div>
          </div>
        </section>

        {/* 결제 금액 */}
        <section className="rounded-lg border border-border bg-card p-4 max-w-md">
          <p className="text-sm text-muted-foreground">
            상품 금액 <span className="float-right">{formatPrice(totalPrice)}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            배송비 <span className="float-right">{formatPrice(shippingFee)}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            배송 예정: 결제 완료 후 3영업일 이내
          </p>
          <p className="font-semibold mt-3 pt-3 border-t border-border">
            총 결제 금액 <span className="float-right">{formatPrice(totalAmount)}</span>
          </p>
        </section>

        {submitError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
            {submitError}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting} className="min-h-12 flex-1">
            {isSubmitting ? '처리 중…' : `${formatPrice(totalAmount)} 결제하기`}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/cart">장바구니로</Link>
          </Button>
        </div>
      </form>
    </main>
  );
}

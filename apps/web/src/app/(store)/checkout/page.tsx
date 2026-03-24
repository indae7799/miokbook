'use client';

import { useState, useCallback, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MapPinned, Percent, Search, ShieldCheck, Truck } from 'lucide-react';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useAuthStore } from '@/store/auth.store';
import { useCart } from '@/hooks/useCart';
import { ShippingAddressSchema } from '@online-miok/schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EmptyState from '@/components/common/EmptyState';
import { calculatePromotionDiscount, promotionOptions } from '@/lib/checkout-promotions';
import { MILEAGE_MAX_USE_RATIO, MILEAGE_MIN_USE, calculateMileageEarn } from '@/lib/mileage';
import { cn } from '@/lib/utils';

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

function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (window.daum?.Postcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Postcode script load failed'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        params: { amount: number; orderId: string; orderName: string; successUrl: string; failUrl: string }
      ) => Promise<unknown>;
    };
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: { zonecode: string; address: string; buildingName?: string; apartment?: string }) => void;
      }) => { open: () => void };
    };
  }
}

const SHIPPING_STORAGE_KEY = 'miok_shipping_v1';

const checkoutSteps = ['장바구니', '배송/혜택', '결제', '완료'];
const deliveryMemoOptions = ['배송 메모를 선택해 주세요', '문 앞에 놓아 주세요', '부재 시 경비실에 맡겨 주세요', '배송 전 연락 부탁드립니다', '직접 입력'];

function SectionCard({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border border-border/80 bg-background p-4 sm:p-5', className)}>
      <div className="mb-4">
        <h2 className="text-[17px] font-semibold tracking-tight text-foreground sm:text-[19px]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SectionCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-foreground sm:text-[19px]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-right">{action}</div> : null}
    </div>
  );
}

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="ml-1 text-[#722f37]">*</span> : null}
      </Label>
      {children}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function toKoreanFieldError(field: string, message?: string): string {
  if (!message) return '';

  const normalized = message.trim();
  if (!normalized) return '';

  const fallbackByField: Record<string, string> = {
    name: '받는 분 이름을 입력해 주세요.',
    phone: '휴대폰 번호를 정확히 입력해 주세요.',
    zipCode: '우편번호를 확인해 주세요.',
    address: '주소를 입력해 주세요.',
    detailAddress: '상세주소를 입력해 주세요.',
  };

  if (normalized.includes('String must contain at least 1 character')) {
    return fallbackByField[field] ?? '필수 정보를 입력해 주세요.';
  }

  if (normalized.includes('Invalid')) {
    return fallbackByField[field] ?? '입력 정보를 다시 확인해 주세요.';
  }

  return normalized;
}

export default function CheckoutPage() {
  useAuthGuard();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isDirect, setIsDirect] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [deliveryMemo, setDeliveryMemo] = useState(deliveryMemoOptions[0]);
  const [customDeliveryMemo, setCustomDeliveryMemo] = useState('');
  const [selectedPromotionCode, setSelectedPromotionCode] = useState(promotionOptions[0].code);
  const { items, enrichedItems, totalPrice, shippingFee } = useCart(isDirect);
  const [mileageBalance, setMileageBalance] = useState(0);
  const [pointsToUseInput, setPointsToUseInput] = useState('0');
  const [hasAgreed, setHasAgreed] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', zipCode: '', address: '', detailAddress: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedAddressLoaded, setSavedAddressLoaded] = useState(false);
  const [savedAddressSource, setSavedAddressSource] = useState<'supabase' | 'local' | null>(null);

  useEffect(() => {
    setIsDirect(new URLSearchParams(window.location.search).get('mode') === 'direct');
  }, []);

  // 저장된 배송지 불러오기: Supabase 기본 배송지 우선, 없으면 localStorage
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/shipping-addresses', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && res.ok) {
          const list = await res.json() as Array<{
            name: string; phone: string; zip_code: string;
            address: string; detail_address: string | null; is_default: boolean;
          }>;
          const def = list.find((a) => a.is_default) ?? list[0] ?? null;
          if (def) {
            setForm({
              name: def.name,
              phone: def.phone,
              zipCode: def.zip_code,
              address: def.address,
              detailAddress: def.detail_address ?? '',
            });
            setSavedAddressLoaded(true);
            setSavedAddressSource('supabase');
            return;
          }
        }
      } catch {}

      // Supabase에 없으면 localStorage fallback
      if (!cancelled) {
        try {
          const raw = localStorage.getItem(SHIPPING_STORAGE_KEY);
          if (!raw) return;
          const saved = JSON.parse(raw) as { form: typeof form; deliveryMemo?: string };
          if (saved.form) setForm(saved.form);
          if (saved.deliveryMemo) setDeliveryMemo(saved.deliveryMemo);
          setSavedAddressLoaded(true);
          setSavedAddressSource('local');
        } catch {}
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const maxPointsByPolicy = Math.min(mileageBalance, Math.floor(totalPrice * MILEAGE_MAX_USE_RATIO));
  const normalizedPointsToUse = Math.max(0, Math.min(maxPointsByPolicy, Math.floor(Number(pointsToUseInput.replace(/\D/g, '') || '0'))));
  const expectedMileageEarn = calculateMileageEarn(totalPrice);
  const promotionDiscount = calculatePromotionDiscount(totalPrice, shippingFee, selectedPromotionCode);
  const finalPayableAmount = Math.max(0, totalPrice + shippingFee - promotionDiscount - normalizedPointsToUse);
  const listPriceTotal = enrichedItems.reduce(
    (sum, row) => sum + ((row.book?.listPrice ?? row.book?.salePrice ?? 0) * row.quantity),
    0
  );
  const directDiscountTotal = Math.max(0, listPriceTotal - totalPrice);
  const totalDiscountAmount = directDiscountTotal + promotionDiscount + normalizedPointsToUse;
  const orderQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedPromotion = promotionOptions.find((item) => item.code === selectedPromotionCode) ?? promotionOptions[0];

  const updateForm = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError(null);
  }, []);

  useEffect(() => {
    if (!user) return;
    user.getIdToken()
      .then((token) => fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } }))
      .then((response) => response?.json())
      .then((data) => setMileageBalance(Math.max(0, Number(data?.mileageBalance ?? 0))))
      .catch(() => {});
  }, [user]);

  const handleAddressSearch = useCallback(async () => {
    setSubmitError(null);
    setIsSearchingAddress(true);
    try {
      await loadDaumPostcodeScript();
      if (!window.daum?.Postcode) throw new Error('주소 검색을 사용할 수 없습니다.');
      const postcode = new window.daum.Postcode({
        oncomplete: (data) => {
          const extra = data.buildingName && data.apartment === 'Y' ? ` (${data.buildingName})` : '';
          updateForm('address', `${data.address}${extra}`);
        },
      });
      postcode.open();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '주소 검색을 불러오지 못했습니다.');
    } finally {
      setIsSearchingAddress(false);
    }
  }, [updateForm]);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setFormErrors({});
    setSubmitError(null);
    const parsed = ShippingAddressSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      const fieldErrors = parsed.error.flatten().fieldErrors;
      Object.entries(fieldErrors).forEach(([key, value]) => {
        if (Array.isArray(value) && value[0]) {
          errors[key] = toKoreanFieldError(key, value[0]);
        }
      });
      setFormErrors(errors);
      setSubmitError('입력되지 않은 항목을 확인해 주세요.');
      return;
    }
    if (!hasAgreed) return setSubmitError('주문 내용과 개인정보 수집 및 이용에 동의해 주세요.');
    if (normalizedPointsToUse > 0 && normalizedPointsToUse < MILEAGE_MIN_USE) {
      return setSubmitError(`마일리지는 최소 ${formatPrice(MILEAGE_MIN_USE)}부터 사용할 수 있습니다.`);
    }
    if (!user) return;
    if (items.length === 0) return setSubmitError('장바구니가 비어 있습니다.');

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: items.map((item) => ({ isbn: item.isbn, quantity: item.quantity })),
          shippingAddress: {
            ...parsed.data,
            deliveryMemo: deliveryMemo === '직접 입력' ? customDeliveryMemo.trim() : deliveryMemo,
          },
          pointsToUse: normalizedPointsToUse,
          promotionCode: selectedPromotionCode,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 409 && data.error === 'STOCK_SHORTAGE') return setSubmitError('일부 상품의 재고가 부족합니다.');
      if (!response.ok) {
        const knownErrors: Record<string, string> = {
          INVALID_POINTS_AMOUNT: '마일리지와 프로모션 할인 합계가 결제 금액을 초과합니다. 마일리지 사용액을 줄여주세요.',
          INVALID_PRICE: '상품 가격 정보를 불러올 수 없습니다. 다시 시도해 주세요.',
          BOOK_NOT_FOUND: '상품 정보를 찾을 수 없습니다. 장바구니를 확인해 주세요.',
        };
        return setSubmitError(knownErrors[data.error] ?? data.error ?? response.statusText ?? '주문 생성에 실패했습니다.');
      }
      // 배송지 저장
      try { localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify({ form, deliveryMemo })); } catch {}

      const payAmount = Number(data.payableAmount ?? ((data.totalPrice ?? totalPrice) + (data.shippingFee ?? shippingFee)));
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) return setSubmitError('결제 설정이 누락되었습니다.');
      await loadTossScript();
      const tossPaymentsFactory = window.TossPayments;
      if (!tossPaymentsFactory) return setSubmitError('결제창을 불러오지 못했습니다.');
      const origin = window.location.origin;
      const orderName =
        enrichedItems.length === 0 ? '온라인미옥 도서' :
        enrichedItems.length === 1 ? (enrichedItems[0].book?.title ?? '온라인미옥 도서') :
        `${enrichedItems[0].book?.title ?? '온라인미옥 도서'} 외 ${enrichedItems.length - 1}건`;
      const tossPayments = tossPaymentsFactory(clientKey);
      await tossPayments.requestPayment('카드', {
        amount: payAmount,
        orderId: data.orderId,
        orderName: orderName.slice(0, 100),
        successUrl: `${origin}/checkout/success?orderId=${data.orderId}${isDirect ? '&mode=direct' : ''}`,
        failUrl: `${origin}/checkout/fail?orderId=${data.orderId}${isDirect ? '&mode=direct' : ''}`,
      });
    } catch (error) {
      // Toss 결제창 취소: { code: 'USER_CANCEL' } 형태로 throw됨 — 에러 메시지 불필요
      const code = error && typeof error === 'object' && 'code' in error ? (error as { code: string }).code : null;
      if (code !== 'USER_CANCEL') {
        setSubmitError(error instanceof Error ? error.message : '결제 요청 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [user, items, form, enrichedItems, totalPrice, shippingFee, normalizedPointsToUse, isDirect, hasAgreed, selectedPromotionCode, deliveryMemo, customDeliveryMemo]);

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#f6f1eb] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <EmptyState title="장바구니가 비어 있습니다" message="결제할 상품을 먼저 담아 주세요." actionButton={{ label: '도서 목록 보기', onClick: () => router.push('/books') }} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f1eb] py-7 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 border-b border-[#d9c7b8] pb-4 sm:mb-7 sm:pb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge className="bg-[#722f37] px-3 py-1 text-xs font-semibold text-white hover:bg-[#722f37]">ORDER CHECKOUT</Badge>
              <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-foreground sm:mt-4 sm:text-[38px]">주문 / 결제</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">배송지, 배송 메모, 프로모션 안내까지 한 화면에서 정리한 결제 흐름입니다.</p>
            </div>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {checkoutSteps.map((step, index) => {
                const active = index === 2;
                const completed = index < 2;
                return (
                  <li key={step} className={cn('border px-4 py-3 text-sm', active ? 'border-[#722f37] bg-[#722f37] text-white' : completed ? 'border-[#d8c4b2] bg-[#f4ebe4] text-[#5f463b]' : 'border-border/80 bg-background text-muted-foreground')}>
                    <span className="block text-xs opacity-80">STEP {index + 1}</span>
                    <span className="mt-1 block font-semibold">{step}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5">
            <div className="space-y-5">
              <SectionCard title={`주문상품 ${orderQuantity}개`} description="수량, 가격, 예상 적립 포인트를 확인한 뒤 결제를 진행합니다.">
                <ul className="space-y-3">
                  {enrichedItems.map((row) => (
                    <li key={row.isbn} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 border border-border/80 bg-[#fcfaf7] p-4">
                      <div className="relative aspect-[188/254] w-[88px] overflow-hidden rounded-md bg-muted">
                        {row.book?.coverImage ? <Image src={row.book.coverImage} alt={row.book.title} fill sizes="88px" className="object-cover" /> : <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">NO IMAGE</div>}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-[#d9c7b8] bg-white text-[#6a4a3c]">주문 도서</Badge>
                          <Badge variant="secondary" className="bg-[#efe5db] text-[#6a4a3c]">적립 예정 {formatPrice(calculateMileageEarn(row.lineTotal))}</Badge>
                        </div>
                        <p className="mt-3 text-base font-semibold leading-[1.55] text-foreground">{row.book?.title ?? row.isbn}</p>
                        <p className="mt-2 text-lg font-bold leading-none text-[#722f37] sm:text-xl">
                          {formatPrice(row.book?.salePrice ?? 0)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">수량 {row.quantity}개</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          정가 {formatPrice((row.book?.listPrice ?? row.book?.salePrice ?? 0) * row.quantity)} / 할인가 {formatPrice(Math.max(0, ((row.book?.listPrice ?? row.book?.salePrice ?? 0) - (row.book?.salePrice ?? 0)) * row.quantity))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <section className="border border-border/80 bg-background p-4 sm:p-5">
                <SectionCardHeader
                  title="배송지 정보"
                  description="정확한 배송을 위해 연락처와 주소를 확인해 주세요."
                  action={
                    <Link href="/mypage/addresses" className="text-sm font-semibold text-[#722f37] hover:text-[#5a2430]">
                      배송지 관리
                    </Link>
                  }
                />
                {savedAddressLoaded ? (
                  <div className="mb-4 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm leading-6 text-emerald-700">
                      {savedAddressSource === 'supabase' ? '기본 배송지가 자동으로 입력되었습니다.' : '최근 배송지가 자동으로 입력되었습니다.'}
                    </p>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <button
                        type="button"
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                        onClick={() => {
                          setForm({ name: '', phone: '', zipCode: '', address: '', detailAddress: '' });
                          setDeliveryMemo(deliveryMemoOptions[0]);
                          setSavedAddressLoaded(false);
                          setSavedAddressSource(null);
                          try { localStorage.removeItem(SHIPPING_STORAGE_KEY); } catch {}
                        }}
                      >
                        초기화
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="name" label="받는 분" required error={formErrors.name}><Input id="name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} /></Field>
                  <Field id="phone" label="휴대폰 번호" required error={formErrors.phone}><Input id="phone" type="tel" inputMode="numeric" value={form.phone} placeholder="숫자만 입력" onChange={(event) => updateForm('phone', event.target.value.replace(/\D/g, '').slice(0, 11))} /></Field>
                  <div className="sm:col-span-2">
                    <Field id="address" label="주소" required error={formErrors.address}>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input id="address" value={form.address} placeholder="기본 주소" onChange={(event) => updateForm('address', event.target.value)} />
                        <Button type="button" variant="outline" className="w-full shrink-0 sm:w-auto" onClick={handleAddressSearch}><Search className="mr-1 size-4" />{isSearchingAddress ? '불러오는 중' : '주소 검색'}</Button>
                      </div>
                    </Field>
                  </div>
                  <div className="sm:col-span-2"><Field id="detailAddress" label="상세주소"><Input id="detailAddress" value={form.detailAddress} placeholder="동, 호수 등 상세정보" onChange={(event) => updateForm('detailAddress', event.target.value)} /></Field></div>
                  <div className="sm:col-span-2">
                    <Field id="deliveryMemo" label="배송 메모">
                      <select id="deliveryMemo" value={deliveryMemo} onChange={(event) => setDeliveryMemo(event.target.value)} className="min-h-[48px] h-12 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                        {deliveryMemoOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </Field>
                    {deliveryMemo === '직접 입력' ? <textarea value={customDeliveryMemo} onChange={(event) => setCustomDeliveryMemo(event.target.value.slice(0, 100))} placeholder="배송 기사님께 전달할 메모를 입력해 주세요" className="mt-3 min-h-[120px] w-full rounded-md border border-input bg-transparent px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" /> : null}
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">배송 메모는 주문 상세 내역에서 확인할 수 있습니다.</p>
                  </div>
                </div>
              </section>

              <SectionCard title="혜택 / 프로모션" description="보유 마일리지와 프로모션 안내를 함께 확인할 수 있습니다.">
                <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                  <div className="space-y-4">
                    <div className="border border-border/80 bg-[#fcfaf7] p-4">
                      <p className="text-sm font-semibold text-foreground">보유 마일리지</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#722f37] sm:text-3xl">{formatPrice(mileageBalance)}</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                        <Field id="mileage" label="사용할 마일리지"><Input id="mileage" inputMode="numeric" value={pointsToUseInput} placeholder="0" onChange={(event) => setPointsToUseInput(event.target.value.replace(/\D/g, ''))} /></Field>
                        <Button type="button" variant="outline" className="w-full sm:mt-[30px]" onClick={() => setPointsToUseInput(String(maxPointsByPolicy))}>최대 사용</Button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">최소 {formatPrice(MILEAGE_MIN_USE)}부터 사용 가능합니다.</p>
                    </div>
                    <div className="hidden lg:block bg-[#2e251f] p-4 text-white">
                      <p className="text-sm uppercase tracking-[0.18em] text-white/65">Benefits</p>
                      <p className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{formatPrice(expectedMileageEarn)}</p>
                      <p className="mt-2 text-sm leading-6 text-white/75">이번 주문 완료 후 적립 예정 마일리지</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {promotionOptions.map((promotion) => {
                      const active = promotion.code === selectedPromotionCode;
                      return (
                        <button key={promotion.code} type="button" onClick={() => setSelectedPromotionCode(promotion.code)} className={cn('w-full border p-4 text-left transition-colors', active ? 'border-[#722f37] bg-[#fff8f7]' : 'border-border/80 bg-[#fcfaf7] hover:border-[#d8c4b2]')}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-foreground">{promotion.label}</p>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">{promotion.description}</p>
                            </div>
                            <Percent className={cn('size-4', active ? 'text-[#722f37]' : 'text-muted-foreground')} />
                          </div>
                        </button>
                      );
                    })}
                    <div className="border-l-2 border-[#d8c4b2] bg-[#fcfaf7] px-4 py-3.5">
                      <div className="mb-3 flex items-center gap-2"><ShieldCheck className="size-4 text-[#722f37]" /><p className="font-semibold text-foreground">프로모션 연결 상태</p></div>
                      <p className="text-sm leading-6 text-muted-foreground">현재는 프로모션 노출만 반영되어 있으며 실제 할인 계산은 별도 정책 API 연결이 필요합니다.</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            <aside className="lg:sticky lg:top-20 lg:self-start lg:row-span-2">
              <div className="overflow-hidden border border-[#d9c7b8] bg-background">
                <div className="bg-[#2e251f] px-5 py-4 text-center text-white">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/65">Payment Summary</p>
                </div>
                <div className="space-y-3.5 p-4 sm:space-y-4 sm:p-5">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">정가</span><span className="tabular-nums font-medium text-foreground">{formatPrice(listPriceTotal)}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">배송비</span><span className="tabular-nums font-medium text-foreground">+ {formatPrice(shippingFee)}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">할인가</span><span className="tabular-nums font-medium text-[#722f37]">- {formatPrice(totalDiscountAmount)}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">마일리지 사용</span><span className="tabular-nums font-medium text-muted-foreground">- {formatPrice(normalizedPointsToUse)}</span></div>
                    <div className="flex items-center justify-between gap-4"><span className="text-muted-foreground">프로모션</span><span className="font-medium text-foreground">{selectedPromotion.label}</span></div>
                  </div>
                  <div className="bg-[#f7f1eb] p-3.5">
                    <div className="flex items-center justify-between gap-4"><span className="text-sm font-semibold text-foreground">결제 예정 금액</span><span className="tabular-nums text-[28px] font-semibold tracking-tight text-[#722f37]">{formatPrice(finalPayableAmount)}</span></div>
                    <div className="mt-2 flex items-center justify-between gap-4"><span className="text-xs text-muted-foreground">적립 예정 마일리지</span><span className="tabular-nums text-sm font-medium text-foreground">{formatPrice(expectedMileageEarn)}</span></div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">상품 {orderQuantity}개 기준입니다.</p>
                  </div>
                  <div className="border border-border/80 bg-[#fcfaf7] p-3.5 text-sm leading-6 text-muted-foreground">
                    <div className="mb-2 flex items-center gap-2 text-foreground"><MapPinned className="size-4 text-[#722f37]" /><span className="font-semibold">현재 배송 메모</span></div>
                    <p>{deliveryMemo === '직접 입력' ? customDeliveryMemo || '직접 입력 내용 없음' : deliveryMemo}</p>
                  </div>
                  <label className="flex items-start gap-3 border border-border/80 bg-[#fcfaf7] p-3.5">
                    <input type="checkbox" checked={hasAgreed} onChange={(event) => setHasAgreed(event.target.checked)} className="mt-1" />
                    <span className="text-sm leading-6 text-foreground">주문 상품 정보, 결제 조건, 개인정보 수집 및 이용 내용을 확인했고 이에 동의합니다.</span>
                  </label>
                  {submitError ? <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm leading-6 text-destructive">{submitError}</div> : null}
                  <Button type="submit" disabled={isSubmitting} className="min-h-11 w-full rounded-md text-[15px] font-semibold text-white sm:min-h-12" style={{ backgroundColor: '#722f37' }}>{isSubmitting ? '준비 중...' : '구매하기'}</Button>
                  <Button type="button" variant="outline" className="w-full rounded-md" asChild><Link href="/cart">장바구니로 돌아가기</Link></Button>
                  <div className="border-l-2 border-[#d8c4b2] px-4 py-3 text-xs leading-5 text-muted-foreground"><div className="mb-2 flex items-center gap-2 text-foreground"><Truck className="size-4 text-[#722f37]" /><span className="font-semibold">결제 안내</span></div>현재는 토스페이먼츠 카드 결제만 지원합니다.</div>
                </div>
              </div>
            </aside>

            {/* 모바일 전용: Payment Summary 다음 Benefits 영역 */}
            <div className="lg:hidden bg-[#2e251f] p-4 text-white">
              <p className="text-sm uppercase tracking-[0.18em] text-white/65">Benefits</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{formatPrice(expectedMileageEarn)}</p>
              <p className="mt-2 text-sm leading-6 text-white/75">이번 주문 완료 후 적립 예정 마일리지</p>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}

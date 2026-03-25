'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Search,
  Truck,
} from 'lucide-react';

/* ─── 타입 ─────────────────────────────────────────────── */
interface OrderItem {
  isbn: string;
  title?: string;
  quantity: number;
  unitPrice?: number;
  coverImage?: string;
}

interface GuestOrder {
  orderId: string;
  status: string;
  shippingStatus: string;
  items: OrderItem[];
  totalPrice: number;
  shippingFee: number;
  promotionDiscount: number;
  promotionLabel: string;
  pointsUsed: number;
  payableAmount: number;
  trackingNumber: string | null;
  carrier: string | null;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    detailAddress: string;
    deliveryMemo: string;
  };
  createdAt: string | null;
  paidAt: string | null;
  deliveredAt: string | null;
}

/* ─── 상태 레이블 ───────────────────────────────────────── */
const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending:           { label: '결제 대기', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  paid:              { label: '결제 완료', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  cancelled:         { label: '주문 취소', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  return_requested:  { label: '반품 요청', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  return_completed:  { label: '반품 완료', color: 'bg-gray-100 text-gray-500 border-gray-200' },
  exchange_requested:{ label: '교환 요청', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  exchange_completed:{ label: '교환 완료', color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const SHIPPING_STATUS_MAP: Record<string, { label: string; step: number }> = {
  ready:     { label: '배송 준비중', step: 1 },
  shipped:   { label: '배송중',      step: 2 },
  delivered: { label: '배송 완료',   step: 3 },
};

function formatPrice(n: number) {
  return `${n.toLocaleString('ko-KR')}원`;
}

function formatDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/* ─── 배송 스텝 바 ──────────────────────────────────────── */
function ShippingSteps({ shippingStatus }: { shippingStatus: string }) {
  const currentStep = SHIPPING_STATUS_MAP[shippingStatus]?.step ?? 0;
  const steps = [
    { step: 0, label: '결제 완료' },
    { step: 1, label: '배송 준비' },
    { step: 2, label: '배송중' },
    { step: 3, label: '배송 완료' },
  ];

  return (
    <div className="relative flex items-center justify-between">
      {/* 연결선 */}
      <div className="absolute left-0 right-0 top-4 h-[2px] bg-[#e8e0d6]" />
      <div
        className="absolute left-0 top-4 h-[2px] bg-[#722f37] transition-all duration-500"
        style={{ width: `${(currentStep / 3) * 100}%` }}
      />
      {steps.map(({ step, label }) => {
        const done = step <= currentStep;
        return (
          <div key={step} className="relative flex flex-col items-center gap-2">
            <div
              className={`relative z-10 flex size-8 items-center justify-center rounded-full border-2 transition-colors ${
                done
                  ? 'border-[#722f37] bg-[#722f37] text-white'
                  : 'border-[#e8e0d6] bg-white text-[#c4b8ae]'
              }`}
            >
              {step === 3 ? (
                <Package className="size-3.5" />
              ) : (
                <span className="text-[11px] font-bold">{step}</span>
              )}
            </div>
            <span
              className={`text-[11px] font-medium ${done ? 'text-[#722f37]' : 'text-[#b39982]'}`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── 메인 콘텐츠 ───────────────────────────────────────── */
function GuestOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderId   = searchParams.get('orderId')    ?? '';
  const initialOrderName = searchParams.get('orderName')  ?? '';

  const [orderId,    setOrderId]    = useState(initialOrderId);
  const [orderName,  setOrderName]  = useState(initialOrderName);
  const [orderPhone, setOrderPhone] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [order,      setOrder]      = useState<GuestOrder | null>(null);
  const [error,      setError]      = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  async function handleLookup(e?: React.FormEvent) {
    e?.preventDefault();
    if (!orderId.trim() || !orderName.trim() || !orderPhone.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const qs = new URLSearchParams({ orderId, orderName, orderPhone });
      const res = await fetch(`/api/orders/guest?${qs}`);
      const data = await res.json();

      if (res.ok) {
        setOrder(data);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      } else {
        setError(
          data.error === 'RATE_LIMITED'
            ? '조회 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'
            : data.error === 'NOT_FOUND'
            ? '일치하는 주문 정보를 찾을 수 없습니다. 주문자명과 휴대폰 번호를 다시 확인해 주세요.'
            : '조회 중 오류가 발생했습니다.',
        );
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialOrderId && initialOrderName && orderPhone) void handleLookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shippingInfo = order ? SHIPPING_STATUS_MAP[order.shippingStatus] : null;
  const orderStatusInfo = order ? ORDER_STATUS_MAP[order.status] : null;

  return (
    <main className="min-h-screen bg-[#faf8f4] py-10 sm:py-16">
      <div className="mx-auto max-w-xl px-4 sm:px-6">

        {/* 상단 헤더 */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex size-9 items-center justify-center rounded-full border border-[#e8e0d6] bg-white text-[#9c7c65] transition-colors hover:border-[#c4a882] hover:text-[#5f3a28]"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9c7c65]">Guest Order</p>
            <h1 className="font-myeongjo text-xl font-semibold text-[#1e1612] sm:text-2xl">비회원 주문 조회</h1>
          </div>
        </div>

        {/* 조회 폼 */}
        <div className="overflow-hidden rounded-2xl border border-[#e8e0d6] bg-white shadow-sm">
          <div className="px-6 py-6 sm:px-8 sm:py-7">
            <p className="mb-5 text-sm text-[#6b5448]">
              주문 시 입력한 정보가 모두 일치해야 조회할 수 있습니다.
            </p>
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#9c7c65]">
                  주문자명
                </label>
                <input
                  type="text"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  placeholder="홍길동"
                  required
                  className="h-12 w-full rounded-xl border border-[#e0d5c8] bg-[#fdf9f4] px-4 text-sm text-[#1e1612] placeholder:text-[#c4b8ae] focus:border-[#722f37] focus:outline-none focus:ring-2 focus:ring-[#722f37]/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#9c7c65]">
                  주문번호
                </label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="주문번호를 입력해 주세요"
                  required
                  className="h-12 w-full rounded-xl border border-[#e0d5c8] bg-[#fdf9f4] px-4 text-sm text-[#1e1612] placeholder:text-[#c4b8ae] focus:border-[#722f37] focus:outline-none focus:ring-2 focus:ring-[#722f37]/15"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#9c7c65]">
                  휴대폰 번호
                </label>
                <input
                  type="tel"
                  value={orderPhone}
                  onChange={(e) => setOrderPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="01012345678"
                  required
                  inputMode="numeric"
                  className="h-12 w-full rounded-xl border border-[#e0d5c8] bg-[#fdf9f4] px-4 text-sm text-[#1e1612] placeholder:text-[#c4b8ae] focus:border-[#722f37] focus:outline-none focus:ring-2 focus:ring-[#722f37]/15"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#722f37] text-sm font-semibold text-white transition-colors hover:bg-[#5f2430] disabled:opacity-60"
              >
                {loading ? (
                  <span className="animate-pulse">조회 중...</span>
                ) : (
                  <>
                    <Search className="size-4" />
                    주문 내역 확인하기
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 빈 상태 */}
          {!order && !loading && !error && (
            <div className="border-t border-[#f0ebe3] px-6 py-10 text-center sm:px-8">
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-[#f5f0e8]">
                <Package className="size-6 text-[#c4a882]" />
              </div>
              <p className="text-sm leading-relaxed text-[#9c7c65]">
                주문번호가 기억나지 않으시면
                <br />
                고객센터로 문의해 주세요.
              </p>
            </div>
          )}
        </div>

        {/* 조회 결과 */}
        {order && (
          <div ref={resultRef} className="mt-5 space-y-4">

            {/* 주문 상태 헤더 */}
            <div className="overflow-hidden rounded-2xl border border-[#e8e0d6] bg-white shadow-sm">
              <div className="border-b border-[#f0ebe3] bg-[#fdf9f4] px-6 py-5 sm:px-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#9c7c65]">주문번호</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-[#1e1612]">{order.orderId}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {orderStatusInfo && (
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${orderStatusInfo.color}`}>
                        {orderStatusInfo.label}
                      </span>
                    )}
                    {shippingInfo && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#e8e0d6] bg-white px-3 py-1 text-xs font-semibold text-[#4a3728]">
                        <Truck className="size-3" />
                        {shippingInfo.label}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-[#b39982]">
                  주문일 {formatDate(order.createdAt)}
                  {order.paidAt && ` · 결제 ${formatDate(order.paidAt)}`}
                </p>
              </div>

              {/* 배송 스텝 */}
              {order.status !== 'cancelled' && (
                <div className="px-6 py-6 sm:px-8">
                  <ShippingSteps shippingStatus={order.shippingStatus} />
                  {order.trackingNumber && (
                    <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#f5f0e8] px-4 py-3">
                      <Truck className="size-4 shrink-0 text-[#722f37]" />
                      <div className="min-w-0">
                        <p className="text-xs text-[#9c7c65]">
                          {order.carrier ?? '택배사'}
                        </p>
                        <p className="font-mono text-sm font-semibold text-[#1e1612]">
                          {order.trackingNumber}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 주문 상품 */}
            <div className="overflow-hidden rounded-2xl border border-[#e8e0d6] bg-white shadow-sm">
              <div className="border-b border-[#f0ebe3] px-6 py-4 sm:px-8">
                <p className="text-sm font-semibold text-[#1e1612]">주문 상품</p>
              </div>
              <ul className="divide-y divide-[#f5f0e8]">
                {order.items.map((item, idx) => (
                  <li key={idx} className="flex gap-4 px-6 py-4 sm:px-8">
                    <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-lg border border-[#e8e0d6] bg-[#f5f0e8] sm:w-[72px]">
                      {item.coverImage ? (
                        <Image src={item.coverImage} alt={item.title ?? ''} fill sizes="72px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="size-6 text-[#c4b8ae]" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="font-myeongjo line-clamp-2 text-[15px] font-medium leading-snug text-[#1e1612]">
                        {item.title ?? item.isbn}
                      </p>
                      <p className="mt-1.5 text-sm text-[#9c7c65]">
                        {formatPrice(item.unitPrice ?? 0)} × {item.quantity}권
                      </p>
                      <Link
                        href={`/books/${item.isbn}`}
                        className="mt-2 inline-flex items-center gap-0.5 text-[12px] font-medium text-[#722f37] hover:underline"
                      >
                        상품 보기 <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* 결제 금액 */}
            <div className="overflow-hidden rounded-2xl border border-[#e8e0d6] bg-white shadow-sm">
              <div className="border-b border-[#f0ebe3] px-6 py-4 sm:px-8">
                <p className="text-sm font-semibold text-[#1e1612]">결제 금액</p>
              </div>
              <div className="space-y-3 px-6 py-5 sm:px-8">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b5448]">상품 금액</span>
                  <span className="font-medium text-[#1e1612]">{formatPrice(order.totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#6b5448]">배송비</span>
                  <span className="font-medium text-[#1e1612]">
                    {order.shippingFee === 0 ? '무료' : formatPrice(order.shippingFee)}
                  </span>
                </div>
                {order.promotionDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b5448]">
                      할인{order.promotionLabel ? ` (${order.promotionLabel})` : ''}
                    </span>
                    <span className="font-medium text-[#722f37]">−{formatPrice(order.promotionDiscount)}</span>
                  </div>
                )}
                {order.pointsUsed > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b5448]">마일리지 사용</span>
                    <span className="font-medium text-[#722f37]">−{formatPrice(order.pointsUsed)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[#f0ebe3] pt-3">
                  <span className="font-semibold text-[#1e1612]">최종 결제금액</span>
                  <span className="text-lg font-bold text-[#722f37]">
                    {formatPrice(order.payableAmount || order.totalPrice + order.shippingFee)}
                  </span>
                </div>
              </div>
            </div>

            {/* 배송지 */}
            <div className="overflow-hidden rounded-2xl border border-[#e8e0d6] bg-white shadow-sm">
              <div className="border-b border-[#f0ebe3] px-6 py-4 sm:px-8">
                <p className="text-sm font-semibold text-[#1e1612]">배송지 정보</p>
              </div>
              <div className="space-y-3 px-6 py-5 sm:px-8 text-sm text-[#4a3728]">
                <div className="flex items-start gap-2.5">
                  <Package className="mt-0.5 size-4 shrink-0 text-[#9c7c65]" />
                  <span className="font-medium">{order.shippingAddress.name}</span>
                </div>
                {order.shippingAddress.phone && (
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 size-4 shrink-0 text-[#9c7c65]" />
                    <span>{order.shippingAddress.phone}</span>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#9c7c65]" />
                  <span className="leading-relaxed">
                    {order.shippingAddress.address}
                    {order.shippingAddress.detailAddress && (
                      <span className="block text-[#9c7c65]">{order.shippingAddress.detailAddress}</span>
                    )}
                  </span>
                </div>
                {order.shippingAddress.deliveryMemo && (
                  <div className="flex items-start gap-2.5">
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-[#9c7c65]" />
                    <span className="text-[#6b5448]">{order.shippingAddress.deliveryMemo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 안내 */}
            <div className="rounded-2xl border border-[#e8e0d6] bg-[#fdf9f4] px-6 py-4 sm:px-8">
              <p className="text-sm leading-relaxed text-[#6b5448]">
                취소·반품·교환은 고객센터를 통해 접수해 주세요.<br />
                회원가입 시 마이페이지에서 더 편리하게 관리할 수 있습니다.
              </p>
              <Link
                href="/signup"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#722f37] hover:underline"
              >
                지금 가입하기 <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── 페이지 ────────────────────────────────────────────── */
export default function GuestOrderPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#faf8f4]">
          <p className="animate-pulse text-sm font-medium text-[#9c7c65]">불러오는 중...</p>
        </main>
      }
    >
      <GuestOrderContent />
    </Suspense>
  );
}

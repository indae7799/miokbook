'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, ChevronRight, Package, RotateCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  createdAt: string | null;
  shippingAddress?: { name?: string; address?: string };
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function GuestOrderContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';
  const initialOrderName = searchParams.get('orderName') || '';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [orderName, setOrderName] = useState(initialOrderName);
  const [orderPhone, setOrderPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<GuestOrder | null>(null);
  const [error, setError] = useState('');

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!orderId || !orderName || !orderPhone) return;

    setIsSearching(true);
    setError('');
    setFoundOrder(null);

    try {
      const params = new URLSearchParams({
        orderId,
        orderName,
        orderPhone,
      });
      const res = await fetch(`/api/orders/guest?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setFoundOrder(data);
      } else if (data.error === 'RATE_LIMITED') {
        setError('조회 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setError(data.error === 'NOT_FOUND'
          ? '일치하는 주문 정보를 찾을 수 없습니다. 주문자명과 휴대폰 번호를 다시 확인해 주세요.'
          : '조회 중 오류가 발생했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialOrderId && initialOrderName && orderPhone) {
      void handleLookup();
    }
  }, [initialOrderId, initialOrderName, orderPhone]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 md:py-20">
      <div className="mx-auto max-w-[600px]">
        <div className="mb-8 flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/login">
              <ArrowLeft className="size-5 text-gray-400" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-gray-900">비회원 주문 조회</h1>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          <div className="border-b border-gray-100 p-8">
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="pl-1 text-xs font-bold uppercase tracking-wider text-gray-400">주문자명</label>
                  <input
                    type="text"
                    value={orderName}
                    onChange={(e) => setOrderName(e.target.value)}
                    placeholder="주문자명을 입력해 주세요"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium transition-all focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="pl-1 text-xs font-bold uppercase tracking-wider text-gray-400">주문번호</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="주문번호를 입력해 주세요"
                    className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium transition-all focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="pl-1 text-xs font-bold uppercase tracking-wider text-gray-400">휴대폰 번호</label>
                <input
                  type="tel"
                  value={orderPhone}
                  onChange={(e) => setOrderPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="주문 시 입력한 휴대폰 번호"
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm font-medium transition-all focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching}
                className="h-12 w-full rounded-xl bg-green-700 font-bold shadow-lg shadow-green-900/10 hover:bg-green-800"
              >
                {isSearching ? '조회 중...' : '주문 내역 확인하기'}
              </Button>
              <p className="text-xs leading-relaxed text-gray-400">
                보안을 위해 주문번호, 주문자명, 휴대폰 번호가 모두 일치해야 조회할 수 있습니다.
              </p>
              {error && <p className="text-center text-xs font-medium text-red-500">{error}</p>}
            </form>
          </div>

          {foundOrder ? (
            <div className="animate-in slide-in-from-bottom-4 fade-in space-y-8 p-8 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-green-700" />
                  <span className="text-sm font-bold text-gray-900">{foundOrder.createdAt?.slice(0, 10)} 주문</span>
                </div>
                <Badge className="border-none bg-green-100 text-green-700 hover:bg-green-100">
                  {foundOrder.shippingStatus === 'delivered' ? '배송완료' : '주문확인'}
                </Badge>
              </div>

              <div className="space-y-4">
                {foundOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="group flex gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:border-gray-200 hover:bg-white"
                  >
                    <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                      {item.coverImage ? (
                        <Image src={item.coverImage} alt={item.title || ''} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-200">
                          <Package className="size-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-1">
                      <h3 className="truncate font-bold text-gray-900 transition-colors group-hover:text-green-800">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-gray-500">
                        {formatPrice(item.unitPrice || 0)} x {item.quantity}권
                      </p>
                      <Link
                        href={`/books/${item.isbn}`}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        상품 상세 보기 <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-dashed border-gray-200 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-400">총 상품금액</span>
                  <span className="font-bold text-gray-900">{formatPrice(foundOrder.totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-400">배송비</span>
                  <span className="font-bold text-gray-900">{formatPrice(foundOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between pt-2 text-lg">
                  <span className="font-black text-gray-900">최종 결제금액</span>
                  <span className="font-black text-green-700">
                    {formatPrice(foundOrder.totalPrice + foundOrder.shippingFee)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 text-xs text-orange-700">
                <RotateCcw className="mt-0.5 size-4 shrink-0" />
                <p className="leading-relaxed">
                  비회원 주문의 취소/반품은 고객센터를 통해 접수해 주세요. 회원가입 후 주문하시면 마이페이지에서 더 편리하게 관리할 수 있습니다.
                </p>
              </div>
            </div>
          ) : !isSearching && !error && (
            <div className="space-y-4 p-12 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                <Search className="size-8" />
              </div>
              <p className="text-sm font-medium leading-relaxed text-gray-400">
                주문 시 입력한 정보로 비회원 주문을 조회할 수 있습니다.
                <br />
                주문번호가 기억나지 않으면 고객센터로 문의해 주세요.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/signup" className="inline-flex items-center gap-1 text-sm font-bold text-green-700 hover:underline">
            지금 가입하고 멤버십 혜택 받기 <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function GuestOrderPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><div className="animate-pulse font-bold text-muted-foreground">주문 정보를 불러오는 중...</div></main>}>
      <GuestOrderContent />
    </Suspense>
  );
}

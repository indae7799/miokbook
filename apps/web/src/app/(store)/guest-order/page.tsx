'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, 
  Package, 
  Truck, 
  RotateCcw, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  CreditCard,
  User as UserIcon
} from 'lucide-react';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get('orderId') || '';
  const initialOrderName = searchParams.get('orderName') || '';

  const [orderId, setOrderId] = useState(initialOrderId);
  const [orderName, setOrderName] = useState(initialOrderName);
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<GuestOrder | null>(null);
  const [error, setError] = useState('');

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!orderId || !orderName) return;

    setIsSearching(true);
    setError('');
    setFoundOrder(null);

    try {
      const res = await fetch(`/api/orders/guest?orderId=${orderId}&orderName=${encodeURIComponent(orderName)}`);
      const data = await res.json();

      if (res.ok) {
        setFoundOrder(data);
      } else {
        setError(data.error === 'NOT_FOUND' ? '일치하는 주문 정보를 찾을 수 없습니다.' : '조회 중 오류가 발생했습니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialOrderId && initialOrderName) {
      handleLookup();
    }
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 md:py-20">
      <div className="max-w-[600px] mx-auto">
        <div className="mb-8 flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/login">
              <ArrowLeft className="size-5 text-gray-400" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-gray-900">비회원 주문 조회</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">주문자명</label>
                  <input
                    type="text"
                    value={orderName}
                    onChange={(e) => setOrderName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 transition-all text-sm font-medium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">주문번호</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="주문번호 16자리"
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-600 transition-all text-sm font-medium"
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={isSearching}
                className="w-full h-12 bg-green-700 hover:bg-green-800 font-bold rounded-xl shadow-lg shadow-green-900/10"
              >
                {isSearching ? '조회 중...' : '주문 내역 확인하기'}
              </Button>
              {error && <p className="text-center text-xs text-red-500 font-medium">{error}</p>}
            </form>
          </div>

          {foundOrder ? (
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-5 text-green-700" />
                  <span className="text-sm font-bold text-gray-900">{foundOrder.createdAt?.slice(0, 10)} 주문</span>
                </div>
                <Badge className="bg-green-100 text-green-700 border-none hover:bg-green-100">{foundOrder.shippingStatus === 'delivered' ? '배송완료' : '상품준비중'}</Badge>
              </div>

              <div className="space-y-4">
                {foundOrder.items.map((item, idx) => (
                  <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group transition-all hover:bg-white hover:border-gray-200">
                    <div className="relative aspect-[3/4] w-20 shrink-0 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                      {item.coverImage ? (
                        <Image src={item.coverImage} alt={item.title || ''} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200"><Package className="size-8" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 py-1">
                      <h3 className="font-bold text-gray-900 truncate group-hover:text-green-800 transition-colors">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1 font-medium">{formatPrice(item.unitPrice || 0)} · {item.quantity}개</p>
                      <Link href={`/books/${item.isbn}`} className="text-[11px] font-bold text-blue-600 mt-2 inline-flex items-center gap-1 hover:underline">
                        상품 상세 보기 <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-dashed border-gray-200 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">총 상품금액</span>
                  <span className="text-gray-900 font-bold">{formatPrice(foundOrder.totalPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">배송비</span>
                  <span className="text-gray-900 font-bold">{formatPrice(foundOrder.shippingFee)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2">
                  <span className="text-gray-900 font-black">최종 결제금액</span>
                  <span className="text-green-700 font-black">{formatPrice(foundOrder.totalPrice + foundOrder.shippingFee)}</span>
                </div>
              </div>

              <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex gap-3 text-orange-700 text-xs">
                <RotateCcw className="size-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">비회원 주문의 경우 취소/반품은 고객센터를 통해 가능합니다. 회원가입을 하시면 마이페이지에서 직접 관리하실 수 있습니다.</p>
              </div>
            </div>
          ) : !isSearching && !error && (
            <div className="p-12 text-center space-y-4">
              <div className="size-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto">
                <Search className="size-8" />
              </div>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                주문 시 입력하신 정보를 입력해 주세요. <br />
                주문번호가 기억나지 않으시면 고객센터로 문의 바랍니다.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/signup" className="text-sm font-bold text-green-700 hover:underline inline-flex items-center gap-1">
            지금 가입하고 멤버십 혜택 받기 <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function GuestOrderPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-muted-foreground font-bold">도서 정보를 찾고 있어요...</div></main>}>
      <GuestOrderContent />
    </Suspense>
  );
}

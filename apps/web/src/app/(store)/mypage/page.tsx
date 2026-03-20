'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import StoreFooter from '@/components/home/StoreFooter';
import {
  Package,
  Truck,
  RotateCcw,
  ChevronRight,
  User as UserIcon,
  CreditCard,
  MapPin,
  Clock,
  AlertCircle
} from 'lucide-react';

interface OrderRow {
  id: string;
  orderId: string;
  status: string;
  shippingStatus: string;
  items: { 
    isbn: string;
    title?: string; 
    quantity?: number; 
    unitPrice?: number;
    coverImage?: string;
  }[];
  totalPrice: number;
  shippingFee: number;
  createdAt: string | null;
  deliveredAt: string | null;
  returnStatus: string;
}

async function fetchMyOrders(token: string): Promise<OrderRow[]> {
  const res = await fetch('/api/orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">결제완료</Badge>;
    case 'cancelled_by_customer': return <Badge variant="destructive">취소완료</Badge>;
    case 'return_requested': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">반품신청</Badge>;
    case 'refunded': return <Badge variant="secondary">환불완료</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function getShippingBadge(status: string) {
  switch (status) {
    case 'ready': return <Badge variant="secondary" className="bg-gray-100 text-gray-600">배송준비중</Badge>;
    case 'shipping': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">배송중</Badge>;
    case 'delivered': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">배송완료</Badge>;
    default: return null;
  }
}

/** deliveredAt 기준 7일 이내인지 */
function isWithinReturnPeriod(deliveredAt: string | null): boolean {
  if (!deliveredAt) return false;
  const d = new Date(deliveredAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
}

export default function MypagePage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [returningId, setReturningId] = useState<string | null>(null);

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list(user?.uid ?? ''),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchMyOrders(token);
    },
    enabled: !!user?.uid,
  });

  const canCancel = (o: OrderRow) => o.status === 'paid' && o.shippingStatus === 'ready';
  const canReturn = (o: OrderRow) =>
    o.status === 'paid' &&
    o.shippingStatus === 'delivered' &&
    o.returnStatus !== 'requested' &&
    o.returnStatus !== 'completed' &&
    isWithinReturnPeriod(o.deliveredAt);

  const handleCancel = async (orderId: string) => {
    if (!user || !confirm('정말로 주문을 취소하시겠습니까?')) return;
    setCancellingId(orderId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/order/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, cancelReason: '고객 요청 취소' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(user.uid) });
      } else {
        alert(data.error || '취소에 실패했습니다.');
      }
    } catch {
      alert('취소 요청 중 오류가 발생했습니다.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReturnRequest = async (orderId: string) => {
    if (!user || !confirm('반품 신청을 진행하시겠습니까?')) return;
    setReturningId(orderId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/order/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, returnReason: '고객 요청 반품' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(user.uid) });
      } else {
        alert(data.error || '반품 신청에 실패했습니다.');
      }
    } catch {
      alert('반품 신청 중 오류가 발생했습니다.');
    } finally {
      setReturningId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="size-12 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="py-20 flex flex-col items-center">
        <AlertCircle className="size-12 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900">로그인이 필요합니다</h2>
        <p className="text-gray-500 mt-2 mb-6">마이페이지는 회원 전용 서비스입니다.</p>
        <Button asChild className="bg-green-700">
          <Link href="/login">로그인하러 가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="max-w-[1000px] mx-auto py-8 px-4 md:py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">마이페이지</h1>
        <p className="text-gray-500 mt-2 font-medium">나의 활동과 주문 내역을 한눈에 확인하세요.</p>
      </header>

      {/* 대시보드 요약카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-full bg-green-50 flex items-center justify-center text-green-700">
            <UserIcon className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">사용자</p>
            <p className="font-bold text-gray-900 truncate max-w-[150px]">{user.displayName || user.email?.split('@')[0] || '회원님'}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">
            <Package className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">진행 중 주문</p>
            <p className="font-bold text-gray-900">{orders.filter(o => o.status === 'paid' && o.shippingStatus !== 'delivered').length}건</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-700">
            <RotateCcw className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">취소/반품</p>
            <p className="font-bold text-gray-900">{orders.filter(o => o.status.includes('cancelled') || o.returnStatus === 'requested').length}건</p>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="size-5 text-green-700" />
            최근 주문 상생 내역
          </h2>
          <span className="text-sm text-gray-500 font-medium">전체 {orders.length}건</span>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-20 shadow-sm">
            <EmptyState
              title="주문 내역이 아직 없습니다"
              message="미옥서원의 알찬 도서들을 지금 만나보세요."
              actionButton={{
                label: "도서 쇼룸 가기",
                onClick: () => router.push('/books')
              }}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((o) => (
              <div
                key={o.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-200"
              >
                {/* 상단 바: 주문번호, 일자, 상태 */}
                <div className="bg-gray-50/50 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{o.createdAt?.slice(0, 10).replace(/-/g, '.')}</span>
                    <span className="text-sm font-bold text-gray-900">주문번로 #{o.orderId.slice(-8)}</span>
                    <Link href={`/mypage/order/${o.orderId}`} className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                      상세보기 <ChevronRight className="size-3" />
                    </Link>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(o.status)}
                    {getShippingBadge(o.shippingStatus)}
                  </div>
                </div>

                {/* 상품 정보 */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* 대표 이미지 (첫 번째 아이템) */}
                    <div className="relative aspect-[3/4] w-24 shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-sm">
                      {o.items?.[0]?.coverImage ? (
                        <Image src={o.items[0].coverImage} alt={o.items[0].title || ''} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="size-8 text-gray-200" /></div>
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <h3 className="font-bold text-gray-900 leading-snug truncate max-w-[400px]">
                        {o.items?.[0]?.title || '알 수 없는 상품'}
                        {(o.items?.length ?? 0) > 1 && <span className="text-gray-400 ml-1">외 {o.items.length - 1}건</span>}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><CreditCard className="size-3.5" /> {formatPrice(o.totalPrice + o.shippingFee)}</span>
                        <span className="text-gray-200">|</span>
                        <span>수량 {o.items?.reduce((acc, it) => acc + (it.quantity ?? 0), 0)}개</span>
                      </div>
                      
                      {/* 액션 버튼 */}
                      <div className="pt-4 flex flex-wrap gap-2">
                        {canCancel(o) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-10 px-4 border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200"
                            disabled={cancellingId === o.orderId}
                            onClick={() => handleCancel(o.orderId)}
                          >
                            {cancellingId === o.orderId ? '취소 중…' : '주문취소'}
                          </Button>
                        )}
                        {canReturn(o) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-10 px-4 border-gray-200 text-gray-700 hover:bg-gray-50"
                            disabled={returningId === o.orderId}
                            onClick={() => handleReturnRequest(o.orderId)}
                          >
                            {returningId === o.orderId ? '신청 중…' : '반품신청'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl h-10 px-4 text-gray-500 hover:text-gray-900"
                          asChild
                        >
                          <Link href={`/books/${o.items?.[0]?.isbn}`}>재구매하기</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* 마이페이지 하단 퀵링크 */}
      <section className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/mypage/profile" className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:border-green-200 transition-all">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-white flex items-center justify-center border border-gray-100 text-gray-500 group-hover:text-green-700">
              <UserIcon className="size-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900">회원정보 관리</p>
              <p className="text-xs text-gray-500 mt-0.5">비밀번호 변경 및 배송지 관리</p>
            </div>
          </div>
          <ChevronRight className="size-5 text-gray-300 group-hover:text-green-700" />
        </Link>
        <Link href="/mypage/addresses" className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:bg-white hover:border-green-200 transition-all">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full bg-white flex items-center justify-center border border-gray-100 text-gray-500 group-hover:text-green-700">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900">나의 배송지</p>
              <p className="text-xs text-gray-500 mt-0.5">자주 사용하는 배송지 목록</p>
            </div>
          </div>
          <ChevronRight className="size-5 text-gray-300 group-hover:text-green-700" />
        </Link>
      </section>
    </main>
    <StoreFooter />
  );
}

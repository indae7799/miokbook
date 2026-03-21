'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
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
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface OrderRow {
  id: string;
  orderId: string;
  status: string;
  shippingStatus: string;
  trackingNumber?: string;
  carrier?: string;
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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
          style={{ backgroundColor: '#722f3715', color: '#722f37' }}>
          결제완료
        </span>
      );
    case 'cancelled_by_customer':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-600">
          취소완료
        </span>
      );
    case 'return_requested':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          반품신청
        </span>
      );
    case 'refunded':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
          환불완료
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border border-border text-muted-foreground">
          {status}
        </span>
      );
  }
}

function ShippingBadge({ status }: { status: string }) {
  switch (status) {
    case 'ready':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
          <Clock className="size-3" /> 배송준비중
        </span>
      );
    case 'shipping':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-foreground/5 text-foreground border border-border">
          <Truck className="size-3" /> 배송중
        </span>
      );
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-muted text-muted-foreground">
          <CheckCircle2 className="size-3" /> 배송완료
        </span>
      );
    default:
      return null;
  }
}

function isWithinReturnPeriod(deliveredAt: string | null): boolean {
  if (!deliveredAt) return false;
  const d = new Date(deliveredAt);
  const now = new Date();
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
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
      <div className="flex flex-col items-center justify-center py-20 gap-4 bg-background min-h-screen">
        <div className="size-10 border-2 border-border border-t-foreground rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="py-20 flex flex-col items-center bg-background min-h-[60vh]">
          <AlertCircle className="size-10 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl font-bold text-foreground">로그인이 필요합니다</h2>
          <p className="text-muted-foreground mt-2 mb-6 text-sm">마이페이지는 회원 전용 서비스입니다.</p>
          <Button asChild className="text-white rounded" style={{ backgroundColor: '#722f37' }}>
            <Link href="/login">로그인하러 가기</Link>
          </Button>
        </div>
        <StoreFooter />
      </>
    );
  }

  const activeOrderCount = orders.filter(o => o.status === 'paid' && o.shippingStatus !== 'delivered').length;
  const cancelReturnCount = orders.filter(o => o.status.includes('cancelled') || o.returnStatus === 'requested').length;

  return (
    <>
      <main className="bg-background min-h-screen">
        <div className="max-w-[960px] mx-auto py-8 md:py-12 px-4">

          {/* 헤더 */}
          <header className="mb-8 pb-6 border-b border-border">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">마이페이지</h1>
            <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>
          </header>

          {/* 요약 카드 3개 */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            <div className="bg-card border border-border rounded p-4 flex flex-col gap-1">
              <UserIcon className="size-5 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">사용자</p>
              <p className="font-bold text-foreground text-sm truncate">
                {user.displayName || user.email?.split('@')[0] || '회원님'}
              </p>
            </div>
            <div className="bg-card border border-border rounded p-4 flex flex-col gap-1">
              <Package className="size-5 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">진행 중 주문</p>
              <p className="font-bold text-foreground text-sm">{activeOrderCount}건</p>
            </div>
            <div className="bg-card border border-border rounded p-4 flex flex-col gap-1">
              <RotateCcw className="size-5 text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">취소 / 반품</p>
              <p className="font-bold text-foreground text-sm">{cancelReturnCount}건</p>
            </div>
          </div>

          {/* 주문 내역 */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="size-4 text-muted-foreground" />
                주문 상세 내역
              </h2>
              <span className="text-xs text-muted-foreground">전체 {orders.length}건</span>
            </div>

            {orders.length === 0 ? (
              <div className="bg-card rounded border border-border py-16">
                <EmptyState
                  title="주문 내역이 아직 없습니다"
                  message="미옥서원의 알찬 도서들을 지금 만나보세요."
                  actionButton={{
                    label: '도서 쇼룸 가기',
                    onClick: () => router.push('/books'),
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-card rounded border border-border overflow-hidden"
                  >
                    {/* 주문 헤더 바 */}
                    <div className="bg-muted/40 px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-border">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-muted-foreground font-mono">
                          {o.createdAt?.slice(0, 10).replace(/-/g, '.')}
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          #{o.orderId.slice(-8).toUpperCase()}
                        </span>
                        <Link
                          href={`/mypage/order/${o.orderId}`}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                        >
                          상세보기 <ChevronRight className="size-3" />
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={o.status} />
                        <ShippingBadge status={o.shippingStatus} />
                      </div>
                    </div>

                    {/* 상품 정보 */}
                    <div className="p-5">
                      <div className="flex gap-4">
                        {/* 표지 */}
                        <div className="relative w-[72px] h-[96px] shrink-0 rounded overflow-hidden bg-muted border border-border">
                          {o.items?.[0]?.coverImage ? (
                            <Image
                              src={o.items[0].coverImage}
                              alt={o.items[0].title || ''}
                              fill
                              className="object-cover"
                              sizes="72px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="size-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        {/* 텍스트 */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                            {o.items?.[0]?.title || '알 수 없는 상품'}
                            {(o.items?.length ?? 0) > 1 && (
                              <span className="text-muted-foreground font-normal ml-1">
                                외 {o.items.length - 1}건
                              </span>
                            )}
                          </h3>

                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CreditCard className="size-3" />
                              {formatPrice(o.totalPrice + o.shippingFee)}
                            </span>
                            <span>·</span>
                            <span>
                              총 {o.items?.reduce((acc, it) => acc + (it.quantity ?? 0), 0)}권
                            </span>
                            {o.shippingFee === 0 && (
                              <>
                                <span>·</span>
                                <span style={{ color: '#722f37' }}>무료배송</span>
                              </>
                            )}
                          </div>

                          {/* 배송 추적 */}
                          {(o.shippingStatus === 'shipping' || o.shippingStatus === 'delivered') &&
                            o.trackingNumber && (
                              <div className="mt-2 flex items-center gap-2 text-xs">
                                <Truck className="size-3 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {o.carrier ?? '택배사'} · {o.trackingNumber}
                                </span>
                                <a
                                  href={`https://search.naver.com/search.naver?query=${encodeURIComponent(`${o.carrier ?? ''} ${o.trackingNumber} 배송조회`)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-0.5 font-medium transition-colors hover:underline"
                                  style={{ color: '#722f37' }}
                                >
                                  배송조회 <ExternalLink className="size-3" />
                                </a>
                              </div>
                            )}

                          {/* 액션 버튼 */}
                          <div className="mt-4 flex flex-wrap gap-2">
                            {canCancel(o) && (
                              <button
                                type="button"
                                className="h-8 px-3 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                disabled={cancellingId === o.orderId}
                                onClick={() => handleCancel(o.orderId)}
                              >
                                {cancellingId === o.orderId ? '취소 중…' : '주문취소'}
                              </button>
                            )}
                            {canReturn(o) && (
                              <button
                                type="button"
                                className="h-8 px-3 text-xs rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                disabled={returningId === o.orderId}
                                onClick={() => handleReturnRequest(o.orderId)}
                              >
                                {returningId === o.orderId ? '신청 중…' : '반품신청'}
                              </button>
                            )}
                            <Link
                              href={`/books/${o.items?.[0]?.isbn}`}
                              className="h-8 px-3 text-xs rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center"
                            >
                              재구매
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 하단 퀵링크 */}
          <section className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/mypage/profile"
              className="p-5 bg-card rounded border border-border flex items-center justify-between group hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserIcon className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <div>
                  <p className="font-semibold text-foreground text-sm">회원정보 관리</p>
                  <p className="text-xs text-muted-foreground mt-0.5">비밀번호 변경 및 배송지 관리</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
            </Link>
            <Link
              href="/mypage/addresses"
              className="p-5 bg-card rounded border border-border flex items-center justify-between group hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <div>
                  <p className="font-semibold text-foreground text-sm">나의 배송지</p>
                  <p className="text-xs text-muted-foreground mt-0.5">자주 사용하는 배송지 목록</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
            </Link>
          </section>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  BarChart3,
  Upload,
  Image as ImageIcon,
  Layers,
  RefreshCw,
} from 'lucide-react';

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid:             { label: '결제완료',   color: 'text-blue-600 bg-blue-50' },
  preparing:        { label: '상품준비중', color: 'text-yellow-600 bg-yellow-50' },
  shipped:          { label: '배송중',     color: 'text-purple-600 bg-purple-50' },
  delivered:        { label: '배송완료',   color: 'text-green-600 bg-green-50' },
  cancelled:        { label: '취소',       color: 'text-gray-500 bg-gray-100' },
  return_requested: { label: '반품신청',   color: 'text-red-600 bg-red-50' },
};

interface DashboardData {
  todayOrderCount: number;
  todayRevenue: number;
  lowStockBooks: { isbn: string; stock: number; title?: string }[];
  recentOrders: {
    id: string;
    orderId?: string;
    status?: string;
    totalPrice?: number;
    shippingFee?: number;
    createdAt: string | null;
  }[];
  returnRequestedCount: number;
  dailyRevenue: { date: string; orderCount: number; revenue: number }[];
  degraded?: boolean;
  degradedMessage?: string;
}

async function fetchDashboard(token: string): Promise<DashboardData> {
  const res = await fetch('/api/admin/dashboard', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  href?: string;
}) {
  const inner = (
    <div className={`rounded-2xl bg-white border border-gray-100 p-5 shadow-sm flex items-start gap-4 ${href ? 'hover:border-green-200 hover:shadow-md transition-all' : ''}`}>
      <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 leading-none">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function RevenueBar({ row, max }: { row: { date: string; revenue: number; orderCount: number }; max: number }) {
  const pct = max > 0 ? (row.revenue / max) * 100 : 0;
  const dateLabel = new Date(row.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-14 text-xs text-gray-400 shrink-0">{dateLabel}</span>
      <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden">
        <div
          className="h-full bg-green-500/80 rounded-lg flex items-center px-2 transition-all duration-500"
          style={{ width: `${Math.max(pct, 2)}%` }}
        >
          {pct > 20 && (
            <span className="text-[10px] text-white font-medium">{formatPrice(row.revenue)}</span>
          )}
        </div>
      </div>
      <span className="text-xs text-gray-400 w-8 text-right shrink-0">{row.orderCount}건</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  // enabled: false → 자동 로딩 안 함. 수동으로 refetch 해야만 Firestore reads 발생
  const [fetchEnabled, setFetchEnabled] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.admin.dashboard(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchDashboard(token);
    },
    enabled: !!user && fetchEnabled,
    staleTime: 10 * 60 * 1000, // 10분 캐시 — 새로고침 눌러도 10분 안엔 reads 없음
  });

  const maxRevenue = Math.max(...(data?.dailyRevenue?.map((r) => r.revenue) ?? [0]), 1);

  // 데이터 미로딩 상태 (버튼 클릭 전)
  if (!fetchEnabled || (!data && !isLoading && !error)) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
          </div>
        </div>

        {/* 빠른 이동 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/orders',    label: '주문 관리',   icon: ShoppingCart, color: 'bg-blue-50 text-blue-500' },
            { href: '/admin/books',     label: '도서 관리',   icon: BookOpen,     color: 'bg-indigo-50 text-indigo-500' },
            { href: '/admin/inventory', label: '재고 관리',   icon: BarChart3,    color: 'bg-amber-50 text-amber-500' },
            { href: '/admin/cms',       label: 'CMS 큐레이션', icon: Layers,       color: 'bg-green-50 text-green-600' },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}
              className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-green-200 hover:shadow-md transition-all group">
              <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="size-4" />
              </div>
              <span className="text-sm font-semibold text-gray-700">{label}</span>
              <ArrowRight className="size-3.5 text-gray-300 ml-auto group-hover:text-green-600 transition-colors" />
            </Link>
          ))}
        </div>

        {/* 통계 로드 버튼 */}
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-8 text-center space-y-3">
          <p className="text-sm text-gray-400">오늘 매출·주문·재고 현황을 확인하려면 아래 버튼을 눌러주세요.</p>
          <p className="text-xs text-gray-300">※ Firestore reads 절약을 위해 수동 로딩 방식입니다.</p>
          <Button
            onClick={() => setFetchEnabled(true)}
            className="bg-green-700 hover:bg-green-800 text-white rounded-xl px-6 h-10 font-semibold text-sm"
          >
            <RefreshCw className="size-4 mr-2" />
            통계 불러오기
          </Button>
        </div>

        {/* 빠른 시작 가이드 */}
        <div className="rounded-2xl bg-green-50 border border-green-100 p-5">
          <h2 className="text-sm font-bold text-green-800 mb-3">빠른 시작 가이드</h2>
          <div className="space-y-3">
            {[
              { icon: Upload,    label: '도서 등록',   desc: 'CSV 업로드 후 자료 수집', href: '/admin/books' },
              { icon: ImageIcon, label: '메인 배너',   desc: '홈 캐러셀 이미지 설정',  href: '/admin/marketing' },
              { icon: Layers,    label: 'CMS 큐레이션', desc: 'MD 추천·테마 큐레이션', href: '/admin/cms' },
            ].map(({ icon: Icon, label, desc, href }) => (
              <Link key={href} href={href} className="flex items-center gap-3 group">
                <div className="size-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                  <Icon className="size-3.5 text-green-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-green-800">{label}</p>
                  <p className="text-[10px] text-green-600">{desc}</p>
                </div>
                <ArrowRight className="size-3.5 text-green-400 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || isFetching) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl">
        <div className="h-7 w-32 bg-gray-100 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => <div key={n} className="h-24 rounded-2xl bg-white border border-gray-100" />)}
        </div>
        <div className="h-48 rounded-2xl bg-white border border-gray-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 max-w-5xl">
        <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
          <p className="font-semibold">데이터를 불러올 수 없습니다</p>
          <p className="mt-1 text-red-400">{error instanceof Error ? error.message : '오류가 발생했습니다.'}</p>
          <p className="mt-2 text-xs text-red-300">Firestore 일일 읽기 한도 초과 시 자정 이후 재시도해 주세요.</p>
          <Button size="sm" variant="outline" onClick={() => setFetchEnabled(false)} className="mt-3 text-xs">
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-3 text-xs rounded-xl gap-1.5">
          <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {data.degraded && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>{data.degradedMessage ?? '일부 통계를 불러오지 못했습니다. Firestore 인덱스·일일 한도를 확인해 주세요.'}</span>
        </div>
      )}

      {/* 핵심 지표 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="오늘 주문"
          value={`${data.todayOrderCount}건`}
          sub="주문 목록 보기"
          icon={ShoppingCart}
          iconColor="bg-blue-50 text-blue-500"
          href="/admin/orders"
        />
        <StatCard
          label="오늘 매출"
          value={formatPrice(data.todayRevenue)}
          icon={TrendingUp}
          iconColor="bg-green-50 text-green-600"
        />
        <StatCard
          label="미처리 반품"
          value={`${data.returnRequestedCount ?? 0}건`}
          sub={data.returnRequestedCount > 0 ? '확인 필요' : '없음'}
          icon={RotateCcw}
          iconColor={data.returnRequestedCount > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}
          href="/admin/orders?status=return_requested"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* 좌측 */}
        <div className="space-y-6">
          {/* 7일 매출 바차트 */}
          {(data.dailyRevenue?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="size-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">최근 7일 매출</h2>
              </div>
              <div className="space-y-2.5">
                {data.dailyRevenue.map((row) => (
                  <RevenueBar key={row.date} row={row} max={maxRevenue} />
                ))}
              </div>
            </div>
          )}

          {/* 최근 주문 */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">최근 주문</h2>
              <Link href="/admin/orders" className="text-xs text-green-700 hover:text-green-800 font-medium flex items-center gap-0.5">
                전체보기 <ArrowRight className="size-3" />
              </Link>
            </div>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">최근 주문이 없습니다.</p>
            ) : (
              <div className="space-y-1">
                {data.recentOrders.map((o) => {
                  const statusInfo = STATUS_MAP[o.status ?? ''] ?? { label: o.status ?? '-', color: 'text-gray-500 bg-gray-100' };
                  return (
                    <Link
                      key={o.id}
                      href={`/admin/orders`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                    >
                      <span className="flex-1 font-mono text-xs text-gray-500 truncate">{o.orderId ?? o.id}</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs font-medium text-gray-700 w-20 text-right">
                        {formatPrice((o.totalPrice ?? 0) + (o.shippingFee ?? 0))}
                      </span>
                      <span className="text-xs text-gray-300 w-14 text-right shrink-0">
                        {formatDate(o.createdAt)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 우측 */}
        <div className="space-y-6">
          {/* 재고 부족 */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="size-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-gray-700">재고 부족</h2>
              <span className="text-[11px] text-gray-300">(5개 미만)</span>
            </div>
            {data.lowStockBooks.length === 0 ? (
              <p className="text-sm text-gray-400 py-2 text-center">모든 도서 재고 양호</p>
            ) : (
              <div className="space-y-2">
                {data.lowStockBooks.map((b) => (
                  <div key={b.isbn} className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600 truncate flex-1 pr-2">{b.title ?? b.isbn}</span>
                    <span className={`font-bold shrink-0 ${b.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                      {b.stock}개
                    </span>
                  </div>
                ))}
                <Link href="/admin/books" className="text-xs text-green-700 hover:text-green-800 font-medium flex items-center gap-0.5 pt-1">
                  도서 관리 <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </div>

          {/* MVP 설정 가이드 (컴팩트) */}
          <div className="rounded-2xl bg-green-50 border border-green-100 p-5">
            <h2 className="text-sm font-bold text-green-800 mb-3">빠른 시작 가이드</h2>
            <div className="space-y-3">
              {[
                { icon: Upload,    label: '도서 등록',   desc: 'CSV 업로드 후 자료 수집', href: '/admin/books' },
                { icon: ImageIcon, label: '메인 배너',   desc: '홈 캐러셀 이미지 설정',  href: '/admin/marketing' },
                { icon: Layers,    label: 'CMS 큐레이션', desc: 'MD 추천·테마 큐레이션', href: '/admin/cms' },
              ].map(({ icon: Icon, label, desc, href }) => (
                <Link key={href} href={href} className="flex items-center gap-3 group">
                  <div className="size-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 group-hover:bg-green-200 transition-colors">
                    <Icon className="size-3.5 text-green-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-green-800">{label}</p>
                    <p className="text-[10px] text-green-600">{desc}</p>
                  </div>
                  <ArrowRight className="size-3.5 text-green-400 ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>

          {/* 도서 통계 링크 */}
          <Link href="/admin/books" className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex items-center gap-3 hover:border-green-200 transition-all group">
            <div className="size-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <BookOpen className="size-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">도서 관리</p>
              <p className="text-xs text-gray-400">등록·수정·재고 관리</p>
            </div>
            <ArrowRight className="size-4 text-gray-300 ml-auto group-hover:text-green-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}

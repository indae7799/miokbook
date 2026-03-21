'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { TrendingUp, ShoppingCart, BarChart2, Award } from 'lucide-react';

function formatPrice(n: number) {
  return `${n.toLocaleString('ko-KR')}원`;
}

interface AnalyticsData {
  period: number;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  dailyRevenue: { date: string; revenue: number; orderCount: number }[];
  bestSellers: { isbn: string; title?: string; quantity: number; revenue: number }[];
}

async function fetchAnalytics(token: string, period: number): Promise<AnalyticsData> {
  const res = await fetch(`/api/admin/analytics?period=${period}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('매출 데이터를 불러오지 못했습니다.');
  return res.json();
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchAnalytics(token, period);
    },
    enabled: !!user,
  });

  const maxRevenue = Math.max(...(data?.dailyRevenue?.map((d) => d.revenue) ?? [0]), 1);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">매출 분석</h1>
          <p className="text-sm text-gray-400 mt-0.5">결제 완료 기준 매출 통계</p>
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {[7, 30, 90].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                period === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {p}일
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(n => <div key={n} className="h-24 rounded-2xl bg-gray-100" />)}
          </div>
          <div className="h-64 rounded-2xl bg-gray-100" />
          <div className="h-48 rounded-2xl bg-gray-100" />
        </div>
      )}

      {error && (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600">
          {error instanceof Error ? error.message : '오류가 발생했습니다.'}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label={`${period}일 총 매출`} value={formatPrice(data.totalRevenue)}
              icon={TrendingUp} color="bg-green-50 text-green-600" />
            <StatCard label={`${period}일 총 주문`} value={`${data.totalOrders.toLocaleString()}건`}
              icon={ShoppingCart} color="bg-blue-50 text-blue-500" />
            <StatCard label="평균 주문금액" value={formatPrice(data.avgOrderValue)} sub="결제 완료 기준"
              icon={BarChart2} color="bg-purple-50 text-purple-500" />
          </div>

          {data.dailyRevenue.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-5">일별 매출</h2>
              <div className="space-y-2">
                {data.dailyRevenue.map((row) => {
                  const pct = (row.revenue / maxRevenue) * 100;
                  return (
                    <div key={row.date} className="flex items-center gap-3 text-sm">
                      <span className="w-20 text-xs text-gray-400 shrink-0 text-right">{row.date}</span>
                      <div className="flex-1 h-7 bg-gray-50 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-green-500/80 rounded-lg transition-all duration-500 flex items-center"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        >
                          {pct > 15 && (
                            <span className="text-[11px] text-white font-medium px-2">
                              {formatPrice(row.revenue)}
                            </span>
                          )}
                        </div>
                        {pct <= 15 && row.revenue > 0 && (
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-500">
                            {formatPrice(row.revenue)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right shrink-0">{row.orderCount}건</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.bestSellers.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="size-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-700">
                  베스트셀러 TOP {data.bestSellers.length}
                </h2>
                <span className="text-[11px] text-gray-400">({period}일 기준, 판매수량 순)</span>
              </div>
              <div className="space-y-1">
                {data.bestSellers.map((book, idx) => (
                  <div key={book.isbn} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <span className={`text-sm font-bold w-6 text-center shrink-0 ${
                      idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-400' : 'text-gray-300'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{book.title ?? book.isbn}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">{book.quantity.toLocaleString()}권</p>
                      <p className="text-xs text-gray-400">{formatPrice(book.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.dailyRevenue.length === 0 && (
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-12 text-center">
              <BarChart2 className="size-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                선택한 기간({period}일)에 결제 완료된 주문이 없습니다.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

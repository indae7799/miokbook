'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import {
  Users,
  Search,
  ChevronRight,
  X,
  ShieldOff,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Loader2,
  Mail,
  Phone,
  CalendarDays,
  LogIn,
  ShoppingBag,
  BadgeCheck,
  Ban,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CustomerRow {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  disabled: boolean;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface CustomerDetail extends CustomerRow {
  orders: {
    id: string;
    orderId: string;
    status: string;
    items: { title?: string; quantity?: number; salePrice?: number }[];
    totalPrice: number;
    shippingFee: number;
    createdAt: string | null;
    paidAt: string | null;
  }[];
}

interface CustomersResponse {
  users: CustomerRow[];
  nextPageToken: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '결제대기',
  paid: '결제완료',
  cancelled: '취소',
  failed: '결제실패',
  cancelled_by_customer: '고객취소',
  return_requested: '반품신청',
  return_completed: '반품완료',
  exchange_requested: '교환신청',
  exchange_completed: '교환완료',
};

function formatPrice(n: number) {
  return `${n.toLocaleString('ko-KR')}원`;
}

function formatDate(s: string | null) {
  if (!s) return '-';
  return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border animate-pulse">
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <td key={i} className="p-3">
          <div className="h-4 rounded bg-muted w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export default function AdminCustomersPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [tokenHistory, setTokenHistory] = useState<string[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // 고객 목록 조회
  const { data, isLoading, error, isFetching } = useQuery<CustomersResponse>({
    queryKey: ['admin', 'customers', pageToken],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (pageToken) params.set('pageToken', pageToken);
      const res = await fetch(`/api/admin/customers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? res.statusText);
      }
      return res.json();
    },
    enabled: !!user,
  });

  // 고객 상세 조회
  const { data: detail, isLoading: detailLoading } = useQuery<CustomerDetail>({
    queryKey: ['admin', 'customers', selectedUid],
    queryFn: async () => {
      if (!user || !selectedUid) throw new Error('No uid');
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(selectedUid)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? res.statusText);
      }
      return res.json();
    },
    enabled: !!user && !!selectedUid,
  });

  // 계정 비활성화/활성화
  const toggleMutation = useMutation({
    mutationFn: async ({ uid, disabled }: { uid: string; disabled: boolean }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/customers/${encodeURIComponent(uid)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ disabled }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? res.statusText);
      }
    },
    onSuccess: (_, { uid, disabled }) => {
      toast.success(disabled ? '계정이 비활성화되었습니다.' : '계정이 활성화되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '처리 실패'),
  });

  const customers = data?.users ?? [];

  const filtered = search.trim()
    ? customers.filter(c =>
        (c.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.displayName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  const handleNextPage = useCallback(() => {
    if (!data?.nextPageToken) return;
    setTokenHistory(prev => [...prev, pageToken ?? '']);
    setPageToken(data.nextPageToken);
  }, [data?.nextPageToken, pageToken]);

  const handlePrevPage = useCallback(() => {
    const history = [...tokenHistory];
    const prev = history.pop() ?? null;
    setTokenHistory(history);
    setPageToken(prev);
  }, [tokenHistory]);

  const handleToggleDisabled = (c: CustomerRow) => {
    const action = c.disabled ? '활성화' : '비활성화';
    if (!window.confirm(`${c.email ?? c.uid} 계정을 ${action}하겠습니까?`)) return;
    toggleMutation.mutate({ uid: c.uid, disabled: !c.disabled });
  };

  return (
    <main className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="size-5" />
            고객 관리
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Firebase Auth 회원 목록 및 구매 통계
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin', 'customers'] })}
          disabled={isFetching}
        >
          <RefreshCw className={`size-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* 검색 */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="이메일 또는 이름 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearch('')}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error instanceof Error ? error.message : '불러오기 실패'}</span>
        </div>
      )}

      {/* 고객 목록 테이블 */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">이메일</th>
                <th className="text-left p-3 font-medium">이름</th>
                <th className="text-left p-3 font-medium">가입일</th>
                <th className="text-left p-3 font-medium">마지막 로그인</th>
                <th className="text-right p-3 font-medium">주문수</th>
                <th className="text-right p-3 font-medium">총구매액</th>
                <th className="text-center p-3 font-medium">상태</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    {search ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'}
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.uid}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedUid(c.uid)}
                  >
                    <td className="p-3">
                      <span className="flex items-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[180px]">{c.email ?? '-'}</span>
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{c.displayName ?? '-'}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(c.lastSignInAt)}</td>
                    <td className="p-3 text-right">{c.orderCount.toLocaleString('ko-KR')}건</td>
                    <td className="p-3 text-right font-medium">{formatPrice(c.totalSpent)}</td>
                    <td className="p-3 text-center">
                      {c.disabled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                          <Ban className="size-3" />
                          비활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          <BadgeCheck className="size-3" />
                          활성
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {filtered.length > 0 ? `${filtered.length}명 표시` : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrevPage}
              disabled={tokenHistory.length === 0 || isFetching}
            >
              이전
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNextPage}
              disabled={!data?.nextPageToken || isFetching}
            >
              다음
            </Button>
          </div>
        </div>
      </div>

      {/* 고객 상세 모달 */}
      {selectedUid && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedUid(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-border"
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-6 py-4">
              <h2 className="text-base font-semibold">고객 상세</h2>
              <button
                className="rounded-full p-1.5 hover:bg-muted transition-colors"
                onClick={() => setSelectedUid(null)}
              >
                <X className="size-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : detail ? (
              <div className="p-6 space-y-6">
                {/* 기본 정보 */}
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-base">{detail.displayName ?? '이름 없음'}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="size-3.5" />
                        {detail.email ?? '-'}
                      </p>
                      {detail.phoneNumber && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone className="size-3.5" />
                          {detail.phoneNumber}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      {detail.disabled ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
                          <Ban className="size-3" />
                          비활성화
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          <BadgeCheck className="size-3" />
                          활성
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CalendarDays className="size-3" /> 가입일
                      </p>
                      <p className="font-medium mt-0.5">{formatDate(detail.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <LogIn className="size-3" /> 마지막 로그인
                      </p>
                      <p className="font-medium mt-0.5">{formatDate(detail.lastSignInAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ShoppingBag className="size-3" /> 총 주문수
                      </p>
                      <p className="font-medium mt-0.5">{detail.orderCount}건</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">총 구매액</p>
                      <p className="font-semibold text-green-700 mt-0.5">{formatPrice(detail.totalSpent)}</p>
                    </div>
                  </div>
                </div>

                {/* 계정 비활성화/활성화 버튼 */}
                <div className="flex justify-end">
                  <Button
                    variant={detail.disabled ? 'default' : 'destructive'}
                    size="sm"
                    onClick={() => handleToggleDisabled(detail)}
                    disabled={toggleMutation.isPending}
                  >
                    {toggleMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin mr-1.5" />
                    ) : detail.disabled ? (
                      <ShieldCheck className="size-4 mr-1.5" />
                    ) : (
                      <ShieldOff className="size-4 mr-1.5" />
                    )}
                    {detail.disabled ? '계정 활성화' : '계정 비활성화'}
                  </Button>
                </div>

                {/* 주문 내역 */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                    <ShoppingBag className="size-4" />
                    주문 내역 ({detail.orders.length}건)
                  </h3>
                  {detail.orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
                      주문 내역이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.orders.map(order => (
                        <div
                          key={order.id}
                          className="rounded-lg border border-border p-3 text-sm space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-muted-foreground">{order.orderId ?? order.id}</span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              order.status === 'paid'
                                ? 'text-blue-700 bg-blue-50'
                                : order.status === 'cancelled' || order.status === 'cancelled_by_customer'
                                ? 'text-gray-500 bg-gray-100'
                                : order.status?.includes('return')
                                ? 'text-red-600 bg-red-50'
                                : 'text-amber-600 bg-amber-50'
                            }`}>
                              {STATUS_LABELS[order.status] ?? order.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {order.items.slice(0, 2).map((item, i) => (
                              <span key={i}>
                                {item.title ?? '도서'} × {item.quantity ?? 1}
                                {i < Math.min(order.items.length, 2) - 1 ? ', ' : ''}
                              </span>
                            ))}
                            {order.items.length > 2 && (
                              <span className="text-muted-foreground"> 외 {order.items.length - 2}종</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{formatDate(order.createdAt)}</span>
                            <span className="font-semibold">
                              {formatPrice(Number(order.totalPrice ?? 0) + Number(order.shippingFee ?? 0))}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                정보를 불러올 수 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

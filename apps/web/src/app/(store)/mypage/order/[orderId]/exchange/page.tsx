'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, RefreshCcw } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { canRequestExchange, buildClaimItemSummary } from '@/lib/order-claim';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OrderItem {
  title?: string;
  quantity?: number;
  unitPrice?: number;
}

interface OrderRow {
  id: string;
  orderId: string;
  displayOrderId?: string;
  status: string;
  shippingStatus: string;
  deliveredAt: string | null;
  returnStatus?: string;
  items: OrderItem[];
  createdAt: string | null;
}

async function fetchMyOrders(token: string): Promise<OrderRow[]> {
  const res = await fetch('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function formatDate(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ko-KR');
}

function formatPrice(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export default function ExchangeRequestPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const orderId = Array.isArray(params?.orderId) ? params.orderId[0] : params?.orderId;
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: queryKeys.orders.list(user?.uid ?? ''),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchMyOrders(token);
    },
    enabled: !!user && !!orderId,
  });

  const order = orders.find((row) => row.id === orderId);
  const claimable = order ? canRequestExchange(order) : false;
  const selectedSummary = useMemo(
    () => (order ? buildClaimItemSummary(order.items, selectedIndexes) : ''),
    [order, selectedIndexes],
  );

  const toggleItem = (index: number) => {
    setSelectedIndexes((prev) =>
      prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index].sort((a, b) => a - b),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !order) return;
    if (selectedIndexes.length === 0) {
      window.alert('교환할 상품을 선택해 주세요.');
      return;
    }
    if (!reason.trim()) {
      window.alert('교환 사유를 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const exchangeReason = [
        `[교환상품] ${selectedSummary}`,
        `[교환사유] ${reason.trim()}`,
      ].join('\n');

      const res = await fetch('/api/order/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId: order.orderId, exchangeReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || '교환 신청에 실패했습니다.');
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.list(user.uid) });
      router.push(`/mypage/order/${order.id}`);
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : '교환 신청 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f6f1eb] px-4 py-10">
        <div className="mx-auto max-w-4xl border border-border/70 bg-background p-6 sm:p-8">
          <p className="text-sm text-muted-foreground">로그인이 필요합니다.</p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f6f1eb] px-4 py-10">
        <div className="mx-auto max-w-4xl border border-border/70 bg-background p-6 sm:p-8">
          <p className="text-sm text-muted-foreground">주문 정보를 불러오는 중입니다.</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#f6f1eb] px-4 py-10">
        <div className="mx-auto max-w-4xl border border-border/70 bg-background p-6 sm:p-8">
          <p className="text-sm text-destructive">{error instanceof Error ? error.message : '주문 정보를 찾을 수 없습니다.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f1eb] px-4 py-8 pb-14">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="border-b border-[#d9c7b8] pb-6">
          <Button variant="outline" asChild className="rounded-md">
            <Link href={`/mypage/order/${order.id}`}>
              <ArrowLeft className="size-4" />
              주문상세로 돌아가기
            </Link>
          </Button>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Badge className="bg-[#2e251f] px-3 py-1 text-xs font-semibold text-white hover:bg-[#2e251f]">EXCHANGE REQUEST</Badge>
            <span className="text-sm text-muted-foreground">{formatDate(order.createdAt)} | 주문번호 {order.displayOrderId ?? order.orderId}</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-4xl">교환 신청</h1>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="border border-[#d8c4b2] bg-[#f7f1eb] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">1 교환 상품 선택</p>
              <p className="mt-2 text-sm text-foreground">교환 신청할 상품을 선택해 주세요.</p>
            </div>
            <div className="border border-border/70 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">2 교환 사유 입력</p>
              <p className="mt-2 text-sm text-foreground">교환이 필요한 사유를 구체적으로 입력해 주세요.</p>
            </div>
          </div>
        </section>

        {!claimable ? (
          <section className="border border-border/70 bg-background p-6 sm:p-8">
            <p className="text-sm text-muted-foreground">이 주문은 현재 교환 신청이 가능한 상태가 아닙니다. 배송완료 후 7일 이내 주문만 교환 신청할 수 있습니다.</p>
          </section>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <section className="border border-border/70 bg-background p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-2">
                <RefreshCcw className="size-4 text-[#722f37]" />
                <h2 className="text-xl font-semibold tracking-tight text-foreground">교환 상품 선택</h2>
              </div>
              <div className="space-y-4">
                {order.items.map((item, index) => {
                  const checked = selectedIndexes.includes(index);
                  return (
                    <label
                      key={`${item.title ?? 'item'}-${index}`}
                      className={`flex cursor-pointer gap-4 border p-4 transition-colors ${checked ? 'border-[#722f37] bg-[#f7f1eb]' : 'border-border/70 bg-[#fcfaf7]'}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4 accent-[#722f37]"
                        checked={checked}
                        onChange={() => toggleItem(index)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-foreground">{item.title || `상품 ${index + 1}`}</p>
                        <p className="mt-1 text-sm text-muted-foreground">수량 : {item.quantity ?? 1}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatPrice(item.unitPrice ?? 0)}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="border border-border/70 bg-background p-5 sm:p-7">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">교환 사유 입력</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">파손, 오배송, 단순 변심 등 교환 사유를 남겨 주세요.</p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={6}
                className="mt-4 w-full rounded-md border border-input bg-background px-3 py-3 text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-[#722f37]"
                placeholder="예: 책 모서리 파손으로 교환을 요청합니다."
              />
              <div className="mt-4 border border-border/70 bg-[#fcfaf7] p-4 text-sm">
                <p className="font-medium text-foreground">선택된 교환 상품</p>
                <p className="mt-2 text-muted-foreground">{selectedSummary || '선택 상품 없음'}</p>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" asChild className="rounded-md">
                <Link href="/books">쇼핑 계속하기</Link>
              </Button>
              <Button type="submit" className="rounded-md bg-[#722f37] text-white hover:bg-[#5d2630]" disabled={submitting}>
                {submitting ? '교환 신청 중...' : '교환 신청 완료'}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

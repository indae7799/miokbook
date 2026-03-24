'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { Package, Clock, FileText, Handshake, CheckCircle2 } from 'lucide-react';

interface BulkOrderRow {
  id: string;
  organization: string;
  contactName: string;
  phone: string;
  email: string;
  deliveryDate: string;
  status: string;
  books: Array<{ title: string; isbn: string; quantity: number }>;
  createdAt: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: '대기',
    className: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="size-3" />,
  },
  quoted: {
    label: '견적발송',
    className: 'bg-blue-100 text-blue-700',
    icon: <FileText className="size-3" />,
  },
  contracted: {
    label: '계약완료',
    className: 'bg-purple-100 text-purple-700',
    icon: <Handshake className="size-3" />,
  },
  completed: {
    label: '납품완료',
    className: 'bg-green-100 text-green-700',
    icon: <CheckCircle2 className="size-3" />,
  },
};

async function fetchBulkOrders(token: string): Promise<{ items: BulkOrderRow[] }> {
  const res = await fetch('/api/admin/bulk-orders', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  return res.json();
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
        {status}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function AdminBulkOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'bulk-orders'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchBulkOrders(token);
    },
    enabled: !!user,
  });

  const orders = data?.items ?? [];

  const counts = {
    pending: orders.filter((o) => o.status === 'pending').length,
    quoted: orders.filter((o) => o.status === 'quoted').length,
    contracted: orders.filter((o) => o.status === 'contracted').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-10 border-4 border-green-200 border-t-green-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 text-sm font-medium">
          {error instanceof Error ? error.message : '데이터를 불러올 수 없습니다.'}
        </p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">대량구매 관리</h1>
        <span className="text-sm text-gray-400">총 {orders.length}건</span>
      </div>

      {/* 상태별 카운트 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'pending', label: '접수 대기', color: 'yellow' },
          { key: 'quoted', label: '견적 발송', color: 'blue' },
          { key: 'contracted', label: '계약 완료', color: 'purple' },
          { key: 'completed', label: '납품 완료', color: 'green' },
        ].map(({ key, label, color }) => (
          <div
            key={key}
            className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
          >
            <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
            <p className={`text-2xl font-black text-${color}-600`}>
              {counts[key as keyof typeof counts]}
            </p>
          </div>
        ))}
      </div>

      {/* 목록 테이블 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="size-14 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <Package className="size-7 text-gray-300" />
            </div>
            <p className="text-gray-400 text-sm">아직 대량구매 문의가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">접수일</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">기관명</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">담당자</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">연락처</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">납품희망일</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">도서</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">상태</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase tracking-wide">액션</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/admin/bulk-orders/${row.id}`)}
                  >
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {row.createdAt ? row.createdAt.slice(0, 10) : '-'}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.organization}</td>
                    <td className="px-4 py-3 text-gray-700">{row.contactName}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{row.deliveryDate || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {row.books?.length ?? 0}종
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/admin/bulk-orders/${row.id}`);
                        }}
                        className="text-xs font-bold text-green-700 hover:text-green-800 hover:underline transition-colors"
                      >
                        상세 보기 →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

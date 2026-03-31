'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, FileText, Handshake, Package, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminToken } from '@/lib/auth-token';
import { useAuthStore } from '@/store/auth.store';

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
    label: '접수 대기',
    className: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="size-3" />,
  },
  quoted: {
    label: '견적 발송',
    className: 'bg-blue-100 text-blue-700',
    icon: <FileText className="size-3" />,
  },
  contracted: {
    label: '계약 완료',
    className: 'bg-purple-100 text-purple-700',
    icon: <Handshake className="size-3" />,
  },
  completed: {
    label: '납품 완료',
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
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-bold text-gray-600">
        {status}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function AdminBulkOrdersPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'bulk-orders'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
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

  const handleDelete = async (row: BulkOrderRow, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!user || deletingId) return;

    const confirmed = window.confirm(`이 대량구매 건을 삭제하시겠습니까?\n\n${row.organization}\n${row.id}`);
    if (!confirmed) return;

    setDeletingId(row.id);
    try {
      const token = await getAdminToken(user);
      const res = await fetch(`/api/admin/bulk-orders/${row.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error((data as { error?: string }).error || '삭제에 실패했습니다.');
        return;
      }
      toast.success('대량구매 건을 삭제했습니다.');
      await refetch();
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-10 animate-spin rounded-full border-4 border-green-200 border-t-green-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-red-500">
          {error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.'}
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { key: 'pending', label: '접수 대기', color: 'yellow' },
          { key: 'quoted', label: '견적 발송', color: 'blue' },
          { key: 'contracted', label: '계약 완료', color: 'purple' },
          { key: 'completed', label: '납품 완료', color: 'green' },
        ].map(({ key, label, color }) => (
          <div key={key} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>
            <p className={`text-2xl font-black text-${color}-600`}>{counts[key as keyof typeof counts]}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-gray-50">
              <Package className="size-7 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">아직 대량구매 문의가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">접수일</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">기관명</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">담당자</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">연락처</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">납품희망일</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">도서</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50"
                    onClick={() => router.push(`/admin/bulk-orders/${row.id}`)}
                  >
                    <td className="px-4 py-3 text-xs text-gray-500">{row.createdAt ? row.createdAt.slice(0, 10) : '-'}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{row.organization}</td>
                    <td className="px-4 py-3 text-gray-700">{row.contactName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.phone}</td>
                    <td className="px-4 py-3 text-gray-500">{row.deliveryDate || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{row.books?.length ?? 0}종</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/bulk-orders/${row.id}`);
                          }}
                          className="text-xs font-bold text-green-700 transition-colors hover:text-green-800 hover:underline"
                        >
                          상세 보기
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(row, e)}
                          disabled={deletingId === row.id}
                          className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="size-3.5" />
                          {deletingId === row.id ? '삭제 중...' : '삭제'}
                        </button>
                      </div>
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

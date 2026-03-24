'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Check, X, Package, AlertTriangle } from 'lucide-react';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';

interface InventoryItem {
  isbn: string;
  title: string;
  author: string;
  coverImage: string;
  status: string;
  stock: number;
  reserved: number;
  available: number;
  salesCount: number;
  updatedAt: string | null;
}

interface InventoryResponse {
  items: InventoryItem[];
  totalCount: number;
  page: number;
  hasNext: boolean;
}

async function fetchInventory(token: string, page: number, lowStock: boolean): Promise<InventoryResponse> {
  const params = new URLSearchParams({ page: String(page), lowStock: String(lowStock) });
  const res = await fetch(`/api/admin/inventory?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('재고 목록을 불러오지 못했습니다.');
  return res.json();
}

async function patchStock(token: string, isbn: string, stock: number): Promise<void> {
  const res = await fetch(`/api/admin/inventory/${isbn}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? '재고 수정 실패');
  }
}

function StockCell({
  item,
  getToken,
  onSuccess,
}: {
  item: InventoryItem;
  getToken: () => Promise<string>;
  onSuccess: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.stock));

  const mutation = useMutation({
    mutationFn: async (stock: number) => {
      const token = await getToken();
      return patchStock(token, item.isbn, stock);
    },
    onSuccess: () => {
      toast.success('재고가 수정되었습니다.');
      setEditing(false);
      onSuccess();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!editing) {
    return (
      <div className="flex items-center justify-center gap-2">
        <span
          className={`font-semibold tabular-nums ${
            item.stock === 0 ? 'text-red-600' : item.stock < 10 ? 'text-yellow-600' : 'text-gray-900'
          }`}
        >
          {item.stock}
        </span>
        <button
          onClick={() => { setValue(String(item.stock)); setEditing(true); }}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          title="재고 수정"
        >
          <Pencil className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-20 h-7 text-sm px-2"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') mutation.mutate(Math.max(0, Number(value)));
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      <button
        onClick={() => mutation.mutate(Math.max(0, Number(value)))}
        disabled={mutation.isPending}
        className="p-1 rounded hover:bg-green-50 text-green-600 disabled:opacity-40 transition-colors"
        title="저장"
      >
        <Check className="size-4" />
      </button>
      <button
        onClick={() => setEditing(false)}
        className="p-1 rounded hover:bg-red-50 text-red-400 transition-colors"
        title="취소"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'all' | 'low'>('all');
  const [page, setPage] = useState(1);

  const getToken = async (): Promise<string> => {
    if (!user) throw new Error('로그인 필요');
    return getAdminToken(user);
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-inventory', tab, page],
    queryFn: async () => {
      const token = await getToken();
      return fetchInventory(token, page, tab === 'low');
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const handleTabChange = (next: 'all' | 'low') => {
    setTab(next);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">재고 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">도서별 재고 현황을 확인하고 수정합니다.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Package className="size-4" />
          총 {data?.totalCount ?? 0}종
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100">
        {(['all', 'low'] as const).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'all' ? (
              '전체'
            ) : (
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-yellow-500" />
                재고 부족 (10개 미만)
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="size-6 border-2 border-green-200 border-t-green-700 rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-400">
            데이터를 불러오는 중 오류가 발생했습니다.
            <button onClick={() => refetch()} className="ml-2 underline">
              재시도
            </button>
          </div>
        ) : !data?.items.length ? (
          <div className="py-20 text-center text-sm text-gray-400">
            {tab === 'low' ? '재고 부족 도서가 없습니다.' : '등록된 도서가 없습니다.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-12"></th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">도서명 / 저자</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">판매가능</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">예약재고</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">총 재고</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">누적판매</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">마지막 수정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.items.map(item => (
                  <tr key={item.isbn} className="hover:bg-gray-50/50 transition-colors">
                    {/* 표지 썸네일 */}
                    <td className="px-4 py-3">
                      <div className="size-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                        {item.coverImage ? (
                          <AdminPreviewImage
                            src={item.coverImage}
                            alt={item.title}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Package className="size-4 text-gray-300" />
                        )}
                      </div>
                    </td>

                    {/* 제목 / 저자 */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium text-gray-900 line-clamp-1">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.author}</p>
                    </td>

                    {/* 판매가능 재고 */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`font-semibold tabular-nums ${
                          item.available === 0
                            ? 'text-red-600'
                            : item.available < 10
                            ? 'text-yellow-600'
                            : 'text-gray-700'
                        }`}
                      >
                        {item.available}
                      </span>
                    </td>

                    {/* 예약재고 */}
                    <td className="px-4 py-3 text-center text-gray-500 tabular-nums">{item.reserved}</td>

                    {/* 총 재고 — 인라인 수정 */}
                    <td className="px-4 py-3 text-center">
                      <StockCell item={item} getToken={getToken} onSuccess={() => refetch()} />
                    </td>

                    {/* 누적 판매 */}
                    <td className="px-4 py-3 text-center text-gray-500 tabular-nums">
                      {item.salesCount.toLocaleString()}
                    </td>

                    {/* 마지막 수정 */}
                    <td className="px-4 py-3 text-center text-xs text-gray-400">
                      {item.updatedAt
                        ? new Date(item.updatedAt).toLocaleDateString('ko-KR', {
                            month: '2-digit',
                            day: '2-digit',
                          })
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {data && (data.page > 1 || data.hasNext) && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            이전
          </Button>
          <span className="text-sm text-gray-500 px-2">{page} 페이지</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.hasNext}
            onClick={() => setPage(p => p + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/client';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const ISBN13_REGEX = /^978\d{10}$/;
const STATUS_LABELS: Record<string, string> = {
  on_sale: '판매중',
  out_of_print: '절판',
  coming_soon: '예약판매',
  old_edition: '구판',
};

function normalizeIsbn(value: unknown): string {
  const s = String(value ?? '').trim().replace(/\.0+$/, '');
  const digits = s.replace(/\D/g, '');
  return digits.length >= 13 ? digits.slice(0, 13) : digits;
}

function validateIsbn(isbn: string): boolean {
  return ISBN13_REGEX.test(isbn);
}

interface BookRow {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  publisher: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
  category: string;
  status: string;
  isActive: boolean;
  stock: number;
  createdAt: string | null;
  updatedAt: string | null;
}

async function fetchBooks(token: string): Promise<BookRow[]> {
  const res = await fetch('/api/admin/books', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export default function AdminBooksPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [editingIsbn, setEditingIsbn] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('');

  const { data: books = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.books(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchBooks(token);
    },
    enabled: !!user,
  });

  const patchMutation = useMutation({
    mutationFn: async ({ isbn, status, stock }: { isbn: string; status?: string; stock?: number }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/books/${encodeURIComponent(isbn)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, stock }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.books() });
      setEditingIsbn(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수정 실패'),
  });

  const handleSaveEdit = (isbn: string) => {
    const status = editStatus && Object.keys(STATUS_LABELS).includes(editStatus) ? editStatus : undefined;
    const stock = editStock !== '' ? parseInt(editStock, 10) : undefined;
    if (status === undefined && (stock === undefined || Number.isNaN(stock))) {
      setEditingIsbn(null);
      return;
    }
    patchMutation.mutate({ isbn, status, stock: Number.isNaN(Number(editStock)) ? undefined : Number(editStock) });
  };

  const handleStartEdit = (row: BookRow) => {
    setEditingIsbn(row.isbn);
    setEditStock(String(row.stock));
    setEditStatus(row.status);
  };

  const handleBulkCreate = async () => {
    if (!csvFile || !functions) {
      toast.error('CSV 파일을 선택해 주세요.');
      return;
    }
    const text = await csvFile.text();
    const parsed = Papa.parse<{ isbn?: string; stock?: string }>(text, { header: true, skipEmptyLines: true });
    const rows = parsed.data ?? [];
    const items: { isbn: string; stock: number }[] = [];
    const invalid: string[] = [];
    for (const row of rows) {
      const raw = row.isbn ?? '';
      const isbn = validateIsbn(raw) ? raw.trim() : (validateIsbn(normalizeIsbn(raw)) ? normalizeIsbn(raw) : '');
      if (!isbn) {
        invalid.push(raw || '(빈값)');
        continue;
      }
      const stock = Math.max(0, parseInt(String(row.stock ?? '0'), 10) || 0);
      items.push({ isbn, stock });
    }
    if (invalid.length) {
      toast.warning(`유효하지 않은 ISBN ${invalid.length}건 제외: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '…' : ''}`);
    }
    if (items.length === 0) {
      toast.error('등록할 수 있는 ISBN이 없습니다.');
      return;
    }
    try {
      const bulkCreateBooks = httpsCallable<{ items: { isbn: string; stock: number }[] }, { data: { success: number; failed: number; errors: string[] } }>(
        functions,
        'bulkCreateBooks'
      );
      const result = await bulkCreateBooks({ items });
      const payload = result.data as { data?: { success?: number; failed?: number; errors?: string[] } } | { success?: number; failed?: number; errors?: string[] };
      const data = (payload && 'data' in payload ? payload.data : payload) as { success?: number; failed?: number; errors?: string[] } | undefined;
      const success = data?.success ?? 0;
      const failed = data?.failed ?? 0;
      const errors = (data?.errors ?? []) as string[];
      toast.success(`자료 수집 완료: 성공 ${success}건, 실패 ${failed}건`);
      if (errors.length > 0) {
        toast.error(`실패 ISBN: ${errors.slice(0, 10).join(', ')}${errors.length > 10 ? '…' : ''}`);
      }
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.books() });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '자료 수집 실패');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="도서 목록을 불러올 수 없습니다"
        message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
      />
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">도서 관리</h1>

      {/* CSV 일괄 등록 — PRD: 2단계 도서 등록 (CSV → 자료 수집 → 알라딘 API) */}
      <section className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5">
        <h2 className="text-lg font-semibold mb-1">📥 CSV/엑셀 일괄 등록 (도서 몰 MVP 1단계)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          엑셀·CSV에 <strong>isbn, stock</strong> 두 컬럼만 넣고 업로드 후 &apos;자료 수집&apos;을 누르면 알라딘 API로 표지·제목·정가 등이 자동 채워집니다.
        </p>
        <ol className="list-decimal list-inside text-sm text-muted-foreground mb-4 space-y-1">
          <li>CSV 또는 엑셀 파일 준비 (헤더: <code className="bg-muted px-1 rounded">isbn</code>, <code className="bg-muted px-1 rounded">stock</code>)</li>
          <li>아래에서 파일 선택 후 <strong>자료 수집</strong> 클릭</li>
          <li>등록된 도서는 스토어 &apos;도서 목록&apos;에 바로 노출됩니다</li>
        </ol>
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="text-sm min-h-[48px]"
            onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            onClick={handleBulkCreate}
            disabled={!csvFile || !functions}
            className="min-h-[48px]"
          >
            자료 수집 (도서 등록)
          </Button>
          {csvFile && <span className="text-sm text-muted-foreground">{csvFile.name}</span>}
        </div>
      </section>

      {/* 도서 목록 */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3 font-medium">ISBN</th>
                <th className="text-left p-3 font-medium">제목</th>
                <th className="text-left p-3 font-medium">저자</th>
                <th className="text-left p-3 font-medium">재고</th>
                <th className="text-left p-3 font-medium">상태</th>
                <th className="text-left p-3 font-medium">동작</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    등록된 도서가 없습니다. CSV로 일괄 등록해 보세요.
                  </td>
                </tr>
              ) : (
                books.map((row) => (
                  <tr key={row.isbn} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{row.isbn}</td>
                    <td className="p-3 max-w-[200px] truncate" title={row.title}>{row.title || '-'}</td>
                    <td className="p-3 max-w-[120px] truncate">{row.author || '-'}</td>
                    <td className="p-3">
                      {editingIsbn === row.isbn ? (
                        <Input
                          type="number"
                          min={0}
                          value={editStock}
                          onChange={(e) => setEditStock(e.target.value)}
                          className="h-9 w-20"
                        />
                      ) : (
                        row.stock
                      )}
                    </td>
                    <td className="p-3">
                      {editingIsbn === row.isbn ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="h-9 rounded border border-input bg-background px-2 text-sm"
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge variant="secondary">{STATUS_LABELS[row.status] ?? row.status}</Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {editingIsbn === row.isbn ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={() => handleSaveEdit(row.isbn)} disabled={patchMutation.isPending}>
                            저장
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingIsbn(null)}>
                            취소
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleStartEdit(row)}>
                          수정
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { queryKeys } from '@/lib/queryKeys';
import { useState, useRef, useCallback, useEffect } from 'react';
import { read, utils } from 'xlsx';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const ISBN13_REGEX = /^(978|979)\d{10}$/;
const STATUS_LABELS: Record<string, string> = {
  on_sale: '판매중',
  out_of_print: '절판',
  coming_soon: '예약판매',
  old_edition: '구판',
};

function normalizeIsbn(value: unknown): string {
  let s = String(value ?? '').trim();
  s = s.replace(/^["']+|["']+$/g, '').trim();
  s = s.replace(/\.0+$/, '');
  if (/[eE]/.test(s)) s = s.replace(',', '.');
  if (/[eE][+\-]?\d/.test(s)) {
    const num = Number(s);
    if (!Number.isNaN(num) && Number.isFinite(num)) s = num.toFixed(0);
  }
  const digits = s.replace(/\D/g, '');
  return digits.length >= 13 ? digits.slice(0, 13) : digits;
}

function validateIsbn(isbn: string): boolean {
  return ISBN13_REGEX.test(isbn);
}

function parseIsbnItems(
  rawRows: Array<{ isbn: unknown; stock: unknown }>,
): { items: Array<{ isbn: string; stock: number }>; invalid: string[] } {
  const items: Array<{ isbn: string; stock: number }> = [];
  const invalid: string[] = [];
  for (const row of rawRows) {
    const raw = String(row.isbn ?? '').trim();
    if (!raw) continue;
    const normalized = normalizeIsbn(raw);
    const isbn = validateIsbn(raw) ? raw : validateIsbn(normalized) ? normalized : '';
    if (!isbn) {
      invalid.push(raw);
      continue;
    }
    const stock = Math.max(0, parseInt(String(row.stock ?? '1'), 10) || 1);
    items.push({ isbn, stock });
  }
  return { items, invalid };
}

function parseFileToRows(
  buffer: ArrayBuffer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- signature kept for call site
  fileName: string,
): Array<{ isbn: unknown; stock: unknown }> {
  const wb = read(buffer, { type: 'array', raw: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json = utils.sheet_to_json<Record<string, unknown>>(ws, { raw: true, defval: '' });

  return json.map((row) => {
    const keys = Object.keys(row);
    const isbnKey = keys.find((k) => k.toLowerCase().replace(/\s/g, '') === 'isbn') ?? keys[0];
    const stockKey = keys.find((k) => {
      const lc = k.toLowerCase().replace(/\s/g, '');
      return lc === 'stock' || lc === '재고';
    }) ?? keys[1];
    return { isbn: row[isbnKey], stock: row[stockKey ?? ''] };
  });
}

function parseTextToRows(text: string): Array<{ isbn: unknown; stock: unknown }> {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstLine = lines[0].toLowerCase().replace(/\s/g, '');
  const hasHeader = firstLine.includes('isbn');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const parts = line.split(/[,;\t]+/).map((p) => p.trim());
    return { isbn: parts[0], stock: parts[1] ?? '1' };
  });
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

interface BooksResponse {
  items: BookRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

async function fetchBooks(token: string, page: number, pageSize: number): Promise<BooksResponse> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  const res = await fetch(`/api/admin/books?${params.toString()}`, {
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
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [cachedBuffer, setCachedBuffer] = useState<ArrayBuffer | null>(null);
  const [manualText, setManualText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [forceSync, setForceSync] = useState(false);
  /** 동기화 연타 시 Firestore reads 방지 — 성공 후 5분 쿨다운 */
  const [syncCooldownSec, setSyncCooldownSec] = useState(0);
  useEffect(() => {
    if (syncCooldownSec <= 0) return;
    const t = setTimeout(() => setSyncCooldownSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [syncCooldownSec]);
  const [categoryRepairLoading, setCategoryRepairLoading] = useState(false);
  const [normalizeSlugLoading, setNormalizeSlugLoading] = useState(false);
  const [newReleaseImportLoading, setNewReleaseImportLoading] = useState(false);
  const [newReleaseImportResult, setNewReleaseImportResult] = useState<string | null>(null);
  const [editingIsbn, setEditingIsbn] = useState<string | null>(null);
  const [editStock, setEditStock] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('');
  const [deletingIsbn, setDeletingIsbn] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 30;
  /** 전체 목록은 표지·대량 로드를 피하려고 접어 두었다가 펼칠 때만 조회 */
  const [fullListOpen, setFullListOpen] = useState(false);
  const [lookupQ, setLookupQ] = useState('');
  const [lookupItems, setLookupItems] = useState<Array<{ isbn: string; title: string; author: string }>>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.books(page, pageSize),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchBooks(token, page, pageSize);
    },
    enabled: !!user && fullListOpen,
    placeholderData: keepPreviousData,
  });
  const books = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNext = data?.hasNext ?? false;

  const patchMutation = useMutation({
    mutationFn: async ({ isbn, status, stock }: { isbn: string; status?: string; stock?: number }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
      setEditingIsbn(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수정 실패'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (isbn: string) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const res = await fetch(`/api/admin/books/${encodeURIComponent(isbn)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
      setDeletingIsbn(null);
      toast.success('도서가 완전히 삭제되었습니다.');
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : '삭제 실패');
    },
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

  const submitItems = useCallback(
    async (items: Array<{ isbn: string; stock: number }>) => {
      if (!user) {
        toast.error('로그인이 필요합니다.');
        return;
      }
      setBulkLoading(true);
      try {
        const token = await getAdminToken(user);
        const res = await fetch('/api/admin/books/bulk-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || res.statusText);
        }
        const data = (await res.json()) as { success?: number; failed?: number; errors?: string[] };
        toast.success(`자료 수집 완료: 성공 ${data.success ?? 0}건, 실패 ${data.failed ?? 0}건`);
        if (data.errors?.length) {
          toast.error(`실패: ${data.errors.slice(0, 10).join(', ')}${data.errors.length > 10 ? '…' : ''}`);
        }
        setManualText('');
        setUploadFile(null);
        setCachedBuffer(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '자료 수집 실패');
      } finally {
        setBulkLoading(false);
      }
    },
    [user, queryClient],
  );

  const handleManualSubmit = useCallback(async () => {
    const text = manualText.trim();
    if (!text) {
      toast.error('ISBN을 입력해 주세요.');
      return;
    }
    const rawRows = parseTextToRows(text);
    const { items, invalid } = parseIsbnItems(rawRows);
    if (invalid.length) {
      toast.warning(`유효하지 않은 ISBN ${invalid.length}건 제외: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '…' : ''}`);
    }
    if (items.length === 0) {
      toast.error('등록할 수 있는 ISBN이 없습니다. ISBN-13(978 또는 979로 시작하는 13자리)을 확인해 주세요.');
      return;
    }
    await submitItems(items);
  }, [manualText, submitItems]);

  const handleFileChange = useCallback(async (file: File | null) => {
    setUploadFile(file);
    setCachedBuffer(null);
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      setCachedBuffer(buf);
    } catch (err) {
      console.error('[admin/books] file read on select error', err);
      toast.error('파일을 읽을 수 없습니다. 다시 선택해 주세요.');
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleFileSubmit = useCallback(async () => {
    if (!uploadFile || !cachedBuffer) {
      toast.error('파일을 선택해 주세요.');
      return;
    }
    try {
      let rawRows: Array<{ isbn: unknown; stock: unknown }>;
      const isExcel = /\.xlsx?$/i.test(uploadFile.name);

      if (isExcel) {
        rawRows = parseFileToRows(cachedBuffer, uploadFile.name);
      } else {
        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(cachedBuffer);
        rawRows = parseTextToRows(text);
      }

      const { items, invalid } = parseIsbnItems(rawRows);
      if (invalid.length) {
        toast.warning(`유효하지 않은 ISBN ${invalid.length}건 제외: ${invalid.slice(0, 5).join(', ')}${invalid.length > 5 ? '…' : ''}`);
      }
      if (items.length === 0) {
        toast.error('등록할 수 있는 ISBN이 없습니다. ISBN-13(978 또는 979로 시작하는 13자리)을 확인해 주세요.');
        return;
      }
      await submitItems(items);
    } catch (err) {
      console.error('[admin/books] file parse error', err);
      toast.error('파일 파싱에 실패했습니다. 파일을 다시 선택해 주세요.');
      setUploadFile(null);
      setCachedBuffer(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [uploadFile, cachedBuffer, submitItems]);

  const handleRepairCovers = useCallback(async () => {
    if (!user) { toast.error('로그인 필요'); return; }
    setBulkLoading(true);
    try {
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/books/repair-covers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const data = await res.json() as { total: number; repaired: number; skipped: number; errors: string[] };
      toast.success(`표지 복구 완료: ${data.repaired}건 복구, ${data.skipped}건 이미 있음`);
      if (data.errors.length) {
        toast.warning(`복구 실패 ${data.errors.length}건: ${data.errors.slice(0, 3).join(', ')}`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '표지 복구 실패');
    } finally {
      setBulkLoading(false);
    }
  }, [user, queryClient]);

  const handleSyncMeilisearch = useCallback(async () => {
    if (!user) { toast.error('로그인 필요'); return; }
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/books/sync-meilisearch', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ force: forceSync }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      
      const resultMsg = data.count === 0 
        ? '동기화할 도서가 없습니다. (모두 최신 상태)' 
        : `완료: ${data.count}건 동기화 (${data.mode === 'full' ? '전체' : '신규/변경분만'})`;
      
      setSyncResult(resultMsg);
      toast.success(resultMsg);
      setSyncCooldownSec(5 * 60);
    } catch (e) {
      setSyncResult('동기화 실패. 다시 시도해주세요.');
      toast.error(e instanceof Error ? e.message : 'Meilisearch 동기화 실패');
    } finally {
      setSyncLoading(false);
    }
  }, [user, forceSync]);

  const handleNormalizeCategorySlug = useCallback(async () => {
    if (!user) {
      toast.error('로그인 필요');
      return;
    }
    setNormalizeSlugLoading(true);
    try {
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/books/normalize-categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success(data.message ?? `${data.updated ?? 0}건 통일`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
      if ((data.updated ?? 0) > 0) {
        toast.info('Meilisearch 동기화를 실행하면 검색·탭 필터에 반영됩니다.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'slug 통일 실패');
    } finally {
      setNormalizeSlugLoading(false);
    }
  }, [user, queryClient]);

  const handleRepairCategories = useCallback(async () => {
    if (!user) { toast.error('로그인 필요'); return; }
    setCategoryRepairLoading(true);
    try {
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/books/repair-categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success(`카테고리 수정 완료: ${data.updated ?? 0}건 변경`);
      if (data.errors?.length) {
        toast.warning(`실패 ${data.errors.length}건`);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
      if ((data.updated ?? 0) > 0) {
        toast.info('Meilisearch 동기화를 실행하면 검색에 반영됩니다.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '카테고리 수정 실패');
    } finally {
      setCategoryRepairLoading(false);
    }
  }, [user, queryClient]);

  const handleImportNewReleases = useCallback(async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    setNewReleaseImportLoading(true);
    setNewReleaseImportResult(null);
    try {
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/books/import-new-releases', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      const message =
        `신간 수집 완료: 추가 ${Number(data.inserted ?? 0).toLocaleString('ko-KR')}권, ` +
        `기존 ${Number(data.skippedExisting ?? 0).toLocaleString('ko-KR')}권, ` +
        `제외 ${Number(data.skippedFiltered ?? 0).toLocaleString('ko-KR')}권`;
      setNewReleaseImportResult(message);
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
    } catch (e) {
      const message = e instanceof Error ? e.message : '신간 수집에 실패했습니다.';
      setNewReleaseImportResult(message);
      toast.error(message);
    } finally {
      setNewReleaseImportLoading(false);
    }
  }, [user, queryClient]);

  const runBookLookup = useCallback(async () => {
    const q = lookupQ.trim();
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    if (!q) {
      toast.error('ISBN·제목·저자 중 하나를 입력해 주세요.');
      return;
    }
    setLookupLoading(true);
    try {
      const token = await getAdminToken(user);
      const res = await fetch(
        `/api/admin/books/search?keyword=${encodeURIComponent(q)}&lite=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      setLookupItems((json.items ?? []) as Array<{ isbn: string; title: string; author: string }>);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '검색 실패');
      setLookupItems([]);
    } finally {
      setLookupLoading(false);
    }
  }, [user, lookupQ]);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">도서 관리</h1>

      {/* 도서 일괄 등록 */}
      <section className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">도서 일괄 등록</h2>
          <p className="text-sm text-muted-foreground mt-1">
            ISBN-13(978 또는 979로 시작하는 13자리)과 재고를 입력하면, 알라딘 API로 제목·저자·표지 등을 자동으로 가져옵니다.
          </p>
        </div>

        {/* 방법 1: 직접 입력 */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">방법 1. 직접 입력 (권장)</h3>
          <p className="text-xs text-muted-foreground">
            한 줄에 하나씩 <code className="bg-muted px-1 rounded">ISBN,재고수</code> 형식으로 입력하세요. 재고수를 생략하면 1로 설정됩니다.
          </p>
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={'9788967038700,10\n9788936437241,5\n9788962623792'}
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          />
          <Button
            type="button"
            onClick={handleManualSubmit}
            disabled={!manualText.trim() || !user || bulkLoading}
            className="min-h-[44px]"
          >
            {bulkLoading ? '처리 중…' : '자료 수집 (도서 등록)'}
          </Button>
        </div>

        {/* 구분선 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">또는</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* 방법 2: 파일 업로드 */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">방법 2. 파일 업로드 (Excel / CSV)</h3>
          <p className="text-xs text-muted-foreground">
            <code className="bg-muted px-1 rounded">isbn</code>, <code className="bg-muted px-1 rounded">stock</code> 컬럼이 있는 <strong>.xlsx</strong> 또는 <strong>.csv</strong> 파일을 업로드하세요.
            엑셀(.xlsx) 파일은 셀의 원본 값을 직접 읽기 때문에 과학 표기법 문제가 없습니다.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="text-sm min-h-[44px]"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              onClick={handleFileSubmit}
              disabled={!uploadFile || !user || bulkLoading}
              className="min-h-[44px]"
            >
              {bulkLoading ? '처리 중…' : '파일로 자료 수집'}
            </Button>
            {uploadFile && <span className="text-sm text-muted-foreground">{uploadFile.name}</span>}
          </div>
        </div>
      </section>

      {/* 유지보수 도구 */}
      <section className="rounded-lg border border-border p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">유지보수 도구</h2>
          <p className="text-sm text-muted-foreground mt-1">
            도서 데이터 정합성 점검 및 검색 동기화 도구입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleImportNewReleases}
              disabled={newReleaseImportLoading || bulkLoading || !user}
              className="min-h-[44px] min-w-[180px]"
            >
              {newReleaseImportLoading ? '신간 수집 중…' : '신간 도서 수집'}
            </Button>
            <p className="max-w-[220px] text-[10px] text-muted-foreground">
              주 1회 자동 수집과 같은 로직을 수동으로 바로 실행합니다.
            </p>
            {newReleaseImportResult ? (
              <p className="max-w-[220px] text-[10px] text-muted-foreground">{newReleaseImportResult}</p>
            ) : null}
          </div>
          {/* Meilisearch 동기화 */}
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleSyncMeilisearch}
              disabled={syncLoading || bulkLoading || !user || syncCooldownSec > 0}
              className="min-h-[44px] min-w-[160px]"
              title={syncCooldownSec > 0 ? `${syncCooldownSec}초 후 다시 사용 가능` : undefined}
            >
              {syncLoading
                ? '동기화 중…'
                : syncCooldownSec > 0
                  ? `동기화 (${Math.ceil(syncCooldownSec / 60)}분 대기)`
                  : 'Meilisearch 동기화'}
            </Button>
            {syncResult && <p className="text-[10px] text-muted-foreground max-w-[160px]">{syncResult}</p>}
            <label className="flex items-center gap-2 text-[11px] text-destructive cursor-pointer">
              <input
                type="checkbox"
                checked={forceSync}
                onChange={e => setForceSync(e.target.checked)}
                className="size-3"
              />
              전체 강제 동기화
            </label>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleRepairCovers}
            disabled={bulkLoading || !user}
            className="min-h-[44px] min-w-[140px]"
            title="표지 URL이 없거나 잘못된 도서를 알라딘에서 재수집"
          >
            {bulkLoading ? '처리 중…' : '표지 일괄 복구'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleNormalizeCategorySlug}
            disabled={normalizeSlugLoading || bulkLoading || !user}
            className="min-h-[44px] min-w-[160px]"
            title="DB category를 탭 slug(소설·경제…)로 통일 — 알라딘 API 없음"
          >
            {normalizeSlugLoading ? '통일 중…' : '카테고리 slug 통일'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleRepairCategories}
            disabled={categoryRepairLoading || bulkLoading || !user}
            className="min-h-[44px] min-w-[140px]"
            title="알라딘 API로 카테고리 재수집 후 수정된 매핑 적용"
          >
            {categoryRepairLoading ? '수정 중…' : '카테고리 수정'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          탭 필터 도서가 안 맞으면 <strong>Meilisearch 동기화</strong> →
          그래도 어긋나면 <strong>카테고리 slug 통일</strong> 후 재동기화.
          표지가 없는 도서는 <strong>표지 일괄 복구</strong>로 알라딘에서 재수집합니다.
        </p>
      </section>

      {/* 잘못 넣은 도서 찾기 — 표지 없이 가볍게 */}
      <section className="rounded-lg border border-border p-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold">도서 찾기 / 삭제</h2>
          <p className="text-sm text-muted-foreground mt-1">
            엑셀·일괄 등록 후에는 여기서 ISBN·제목·저자로 검색한 뒤 필요하면 삭제하면 됩니다. 표지·전체 목록 페이징은 부담이 커서 기본 화면에서는 빼 두었습니다.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            className="max-w-xl font-mono text-sm"
            placeholder="ISBN 또는 제목·저자 일부"
            value={lookupQ}
            onChange={(e) => setLookupQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runBookLookup()}
          />
          <Button type="button" variant="secondary" onClick={runBookLookup} disabled={lookupLoading}>
            {lookupLoading ? '검색 중…' : '검색'}
          </Button>
        </div>
        {lookupItems.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left p-2 font-medium">ISBN</th>
                  <th className="text-left p-2 font-medium">제목</th>
                  <th className="text-left p-2 font-medium">저자</th>
                  <th className="text-right p-2 font-medium w-[88px]">동작</th>
                </tr>
              </thead>
              <tbody>
                {lookupItems.map((row) => (
                  <tr key={row.isbn} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="p-2 font-mono text-xs align-top">{row.isbn}</td>
                    <td className="p-2 max-w-[240px] align-top" title={row.title}>
                      <span className="line-clamp-2">{row.title || '—'}</span>
                    </td>
                    <td className="p-2 text-muted-foreground max-w-[140px] align-top">
                      <span className="line-clamp-2">{row.author || '—'}</span>
                    </td>
                    <td className="p-2 text-right align-top">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (deleteMutation.isPending) return;
                          const ok = window.confirm(
                            `이 도서를 삭제할까요?\n\nISBN: ${row.isbn}\n${row.title}`,
                          );
                          if (!ok) return;
                          deleteMutation.mutate(row.isbn, {
                            onSuccess: () => {
                              setLookupItems((prev) => prev.filter((x) => x.isbn !== row.isbn));
                            },
                          });
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        삭제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 전체 목록 — 펼칠 때만 API·페이지네이션 (표지 없음) */}
      <details
        className="rounded-lg border border-border overflow-hidden group/details"
        onToggle={(e) => setFullListOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium bg-muted/30 hover:bg-muted/50 border-b border-border list-none flex items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          <span>전체 도서 목록 · 재고·상태 수정 (펼치면 {pageSize}권 단위로 로드)</span>
          <span className="text-xs font-normal text-muted-foreground shrink-0">
            {fullListOpen && data ? `총 ${data.totalCount.toLocaleString('ko-KR')}권` : '접힘'}
          </span>
        </summary>
        {fullListOpen && error && (
          <div className="p-6">
            <EmptyState
              title="목록을 불러올 수 없습니다"
              message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
            />
          </div>
        )}
        {fullListOpen && !error && (
          <>
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
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-muted-foreground">
                    <div className="inline-block size-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                    <p>목록 불러오는 중…</p>
                  </td>
                </tr>
              ) : books.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    등록된 도서가 없습니다. ISBN을 입력하여 도서를 등록해 보세요.
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
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleStartEdit(row)}>
                            수정
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (deletingIsbn || deleteMutation.isPending) return;
                              const ok = window.confirm(
                                `정말 이 도서를 완전히 삭제할까요?\n\nISBN: ${row.isbn}\n제목: ${row.title}\n\n이 작업은 되돌릴 수 없습니다.`,
                              );
                              if (!ok) return;
                              setDeletingIsbn(row.isbn);
                              deleteMutation.mutate(row.isbn);
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            삭제
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">총 {totalCount.toLocaleString('ko-KR')}권</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
              이전
            </Button>
            <span className="px-2 text-muted-foreground">{page}페이지</span>
            <Button size="sm" variant="outline" onClick={() => setPage((prev) => prev + 1)} disabled={!hasNext}>
              다음
            </Button>
          </div>
        </div>
          </>
        )}
      </details>
    </main>
  );
}

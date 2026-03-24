'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';
import {
  Star, TrendingUp, Sparkles, Search, Plus, Trash2, GripVertical, Save,
} from 'lucide-react';

// ─── 타입 ───────────────────────────────────────────────────────────────────

interface PickBook {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
  note?: string; // MD 한마디
}

interface PicksData {
  mdPicks: PickBook[];        // MD 이주의 추천 (최대 10)
  newArrivals: PickBook[];    // 신간 (최대 20)
  bestSellers: PickBook[];    // 베스트셀러 (최대 20)
}

interface SearchResult {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  coverImage: string;
  listPrice: number;
  salePrice: number;
}

type Tab = 'mdPicks' | 'newArrivals' | 'bestSellers';

const TAB_CONFIG = {
  mdPicks:     { label: 'MD 이주의 추천', icon: Star,      max: 10, color: 'text-amber-500' },
  newArrivals: { label: '신간 추천',      icon: Sparkles,  max: 20, color: 'text-blue-500' },
  bestSellers: { label: '베스트셀러',     icon: TrendingUp, max: 20, color: 'text-green-600' },
} as const;

// ─── API ────────────────────────────────────────────────────────────────────

async function fetchPicks(token: string): Promise<PicksData> {
  const res = await fetch('/api/admin/cms', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('선정도서 데이터를 불러오지 못했습니다.');
  const data = await res.json();
  return {
    mdPicks:     data.mdPicks     ?? [],
    newArrivals: data.newArrivals ?? [],
    bestSellers: data.bestSellers ?? [],
  };
}

async function savePicks(token: string, picks: Partial<PicksData>): Promise<void> {
  const res = await fetch('/api/admin/cms', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(picks),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? '저장에 실패했습니다.');
  }
}

async function searchBooks(token: string, q: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/admin/books/search?q=${encodeURIComponent(q)}&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? data ?? [];
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

function BookSearchPanel({
  token,
  onAdd,
  existingIsbns,
}: {
  token: string;
  onAdd: (book: PickBook) => void;
  existingIsbns: Set<string>;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await searchBooks(token, q);
      setResults(res);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50 space-y-3">
      <div className="flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="도서명 또는 ISBN으로 검색"
          className="h-10 rounded-lg bg-white"
        />
        <Button onClick={handleSearch} disabled={searching} size="sm" className="h-10 px-4">
          <Search className="size-4" />
        </Button>
      </div>
      {results.length > 0 && (
        <ul className="space-y-1 max-h-60 overflow-y-auto">
          {results.map((book) => (
            <li
              key={book.isbn}
              className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-100 hover:border-green-200 transition-colors"
            >
              <div className="relative w-8 h-11 rounded shrink-0 overflow-hidden bg-gray-100">
                {book.coverImage && (
                  <AdminPreviewImage src={book.coverImage} alt={book.title} fill sizes="32px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{book.title}</p>
                <p className="text-[11px] text-gray-400">{book.author}</p>
              </div>
              <Button
                size="sm"
                variant={existingIsbns.has(book.isbn) ? 'outline' : 'default'}
                disabled={existingIsbns.has(book.isbn)}
                onClick={() => onAdd({ ...book, note: '' })}
                className="h-7 px-2 text-xs shrink-0"
              >
                {existingIsbns.has(book.isbn) ? '추가됨' : <Plus className="size-3.5" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PickList({
  books,
  onRemove,
  onMoveUp,
  onMoveDown,
  onNoteChange,
  showNote,
}: {
  books: PickBook[];
  onRemove: (isbn: string) => void;
  onMoveUp: (idx: number) => void;
  onMoveDown: (idx: number) => void;
  onNoteChange?: (isbn: string, note: string) => void;
  showNote?: boolean;
}) {
  if (books.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
        도서를 검색해서 추가해 주세요
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {books.map((book, idx) => (
        <li key={book.isbn} className="flex gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-colors">
          {/* 순서 조절 */}
          <div className="flex flex-col gap-0.5 justify-center shrink-0">
            <button
              onClick={() => onMoveUp(idx)}
              disabled={idx === 0}
              className="size-5 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20"
            >
              ▲
            </button>
            <button
              onClick={() => onMoveDown(idx)}
              disabled={idx === books.length - 1}
              className="size-5 flex items-center justify-center text-gray-300 hover:text-gray-600 disabled:opacity-20"
            >
              ▼
            </button>
          </div>

          {/* 순번 */}
          <span className="text-sm font-bold text-gray-300 w-5 text-center self-center">{idx + 1}</span>

          {/* 표지 */}
          <div className="relative w-10 h-14 rounded overflow-hidden bg-gray-100 shrink-0 self-center">
            {book.coverImage && (
              <AdminPreviewImage src={book.coverImage} alt={book.title} fill sizes="40px" className="object-cover" />
            )}
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{book.title}</p>
            <p className="text-xs text-gray-400">{book.author} · {book.publisher}</p>
            {showNote && onNoteChange && (
              <input
                value={book.note ?? ''}
                onChange={(e) => onNoteChange(book.isbn, e.target.value)}
                placeholder="MD 한마디 (선택)"
                className="mt-1.5 w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500 bg-gray-50"
              />
            )}
          </div>

          {/* 삭제 */}
          <button
            onClick={() => onRemove(book.isbn)}
            className="size-7 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0 self-center"
          >
            <Trash2 className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function AdminPicksPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('mdPicks');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'picks'],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchPicks(token);
    },
    enabled: !!user,
  });

  const [localPicks, setLocalPicks] = useState<PicksData | null>(null);
  const picks = localPicks ?? data ?? { mdPicks: [], newArrivals: [], bestSellers: [] };

  // 데이터 로드 후 로컬 상태 동기화
  const initLocalIfNeeded = useCallback((data: PicksData) => {
    if (!localPicks) setLocalPicks(data);
  }, [localPicks]);

  if (data && !localPicks) initLocalIfNeeded(data);

  const saveMutation = useMutation({
    mutationFn: async (tab: Tab) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      await savePicks(token, { [tab]: picks[tab] });
    },
    onSuccess: (_, tab) => {
      toast.success(`${TAB_CONFIG[tab].label} 저장 완료`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'picks'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

  const handleAdd = (tab: Tab) => (book: PickBook) => {
    const max = TAB_CONFIG[tab].max;
    setLocalPicks((prev) => {
      const cur = prev ?? picks;
      if (cur[tab].length >= max) {
        toast.warning(`최대 ${max}권까지 추가할 수 있습니다.`);
        return cur;
      }
      if (cur[tab].some((b) => b.isbn === book.isbn)) {
        toast.warning('이미 추가된 도서입니다.');
        return cur;
      }
      return { ...cur, [tab]: [...cur[tab], book] };
    });
  };

  const handleRemove = (tab: Tab) => (isbn: string) => {
    setLocalPicks((prev) => {
      const cur = prev ?? picks;
      return { ...cur, [tab]: cur[tab].filter((b) => b.isbn !== isbn) };
    });
  };

  const handleMove = (tab: Tab, idx: number, dir: 'up' | 'down') => {
    setLocalPicks((prev) => {
      const cur = prev ?? picks;
      const list = [...cur[tab]];
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= list.length) return cur;
      [list[idx], list[swapIdx]] = [list[swapIdx], list[idx]];
      return { ...cur, [tab]: list };
    });
  };

  const handleNoteChange = (tab: Tab) => (isbn: string, note: string) => {
    setLocalPicks((prev) => {
      const cur = prev ?? picks;
      return {
        ...cur,
        [tab]: cur[tab].map((b) => b.isbn === isbn ? { ...b, note } : b),
      };
    });
  };

  const token = user ? null : null; // will be fetched per action

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-7 w-40 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded-xl" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-100 text-sm text-red-600">
        {error instanceof Error ? error.message : '오류가 발생했습니다.'}
      </div>
    );
  }

  const curList = picks[activeTab];
  const existingIsbns = new Set(curList.map((b) => b.isbn));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">MD 선정도서</h1>
        <p className="text-sm text-gray-400 mt-0.5">홈 화면과 큐레이션 페이지에 노출되는 선정도서를 관리합니다.</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(Object.entries(TAB_CONFIG) as [Tab, typeof TAB_CONFIG[Tab]][]).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isActive ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className={`size-4 ${isActive ? cfg.color : 'text-gray-400'}`} />
              {cfg.label}
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'
              }`}>
                {curList.length}/{TAB_CONFIG[activeTab].max}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5">
        {/* 도서 검색 추가 */}
        {user && (
          <UserTokenWrapper user={user}>
            {(token) => (
              <BookSearchPanel
                token={token}
                onAdd={handleAdd(activeTab)}
                existingIsbns={existingIsbns}
              />
            )}
          </UserTokenWrapper>
        )}

        {/* 선정 목록 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <GripVertical className="size-4 text-gray-300" />
              선정 도서 목록
            </h2>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate(activeTab)}
              disabled={saveMutation.isPending}
              className="h-8 px-3 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs"
            >
              <Save className="size-3.5 mr-1" />
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>

          <PickList
            books={curList}
            onRemove={handleRemove(activeTab)}
            onMoveUp={(idx) => handleMove(activeTab, idx, 'up')}
            onMoveDown={(idx) => handleMove(activeTab, idx, 'down')}
            onNoteChange={activeTab === 'mdPicks' ? handleNoteChange(activeTab) : undefined}
            showNote={activeTab === 'mdPicks'}
          />
        </div>
      </div>
    </div>
  );
}

// 토큰을 비동기로 가져오는 래퍼
function UserTokenWrapper({
  user,
  children,
}: {
  user: { getIdToken: () => Promise<string> };
  children: (token: string) => React.ReactNode;
}) {
  const [token, setToken] = useState<string | null>(null);

  if (!token) {
    Promise.race([
      user.getIdToken(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('token timeout')), 12_000),
      ),
    ]).then(setToken).catch(() => {});
    return (
      <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
    );
  }

  return <>{children(token)}</>;
}

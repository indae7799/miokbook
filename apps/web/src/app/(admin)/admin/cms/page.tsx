'use client';

import AdminPreviewImage from '@/components/admin/AdminPreviewImage';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import DragSortableList from '@/components/admin/DragSortableList';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState, useCallback, useEffect } from 'react';
import { GRADE_KEYS, type GradeKey } from '@/lib/constants/grades';

interface FeaturedBook {
  isbn: string;
  title: string;
  coverImage: string;
  priority: number;
  recommendationText: string;
}

interface MonthlyPick {
  isbn: string;
  title: string;
  coverImage: string;
  description: string;
}

type BookItem = { isbn: string; title: string; coverImage: string };
type AllSelectedBooks = Partial<Record<GradeKey, BookItem[]>>;

interface CmsHome {
  heroBanners: unknown[];
  featuredBooks: FeaturedBook[];
  monthlyPick: MonthlyPick | null;
  selectedBooks: AllSelectedBooks;
  selectedBooksBanner: { imageUrl: string; linkUrl: string } | null;
  updatedAt: string | null;
}

async function fetchCms(token: string): Promise<CmsHome> {
  const res = await fetch('/api/admin/cms', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function searchBooks(token: string, keyword: string) {
  const res = await fetch(`/api/admin/books/search?keyword=${encodeURIComponent(keyword)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.items ?? []) as { isbn: string; title: string; coverImage: string; author: string }[];
}

export default function AdminCmsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // --- Featured Books ---
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState<{ isbn: string; title: string; coverImage: string; author: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [editingBook, setEditingBook] = useState<FeaturedBook | null>(null);
  const [editRecText, setEditRecText] = useState('');

  // --- Monthly Pick ---
  const [monthlyPickOpen, setMonthlyPickOpen] = useState(false);
  const [mpSearch, setMpSearch] = useState('');
  const [mpResults, setMpResults] = useState<{ isbn: string; title: string; coverImage: string; author: string }[]>([]);
  const [mpSearchLoading, setMpSearchLoading] = useState(false);
  const [mpDescription, setMpDescription] = useState('');
  const [mpSelected, setMpSelected] = useState<{ isbn: string; title: string; coverImage: string } | null>(null);

  // --- 선정도서 배너 ---
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerLink, setBannerLink] = useState('/');
  const [bannerUploading, setBannerUploading] = useState(false);

  // --- 학년별 선정도서 ---
  const [allSelectedBooks, setAllSelectedBooks] = useState<AllSelectedBooks>({});
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedGradeKey, setSelectedGradeKey] = useState<GradeKey>('e5');
  const [gradeBooks, setGradeBooks] = useState<BookItem[]>([]);
  const [gradeBookSearch, setGradeBookSearch] = useState('');
  const [gradeBookResults, setGradeBookResults] = useState<{ isbn: string; title: string; coverImage: string; author: string }[]>([]);
  const [gradeBookSearchLoading, setGradeBookSearchLoading] = useState(false);
  const [gradeAddTab, setGradeAddTab] = useState<'search' | 'batch'>('search');
  const [isbnBatchText, setIsbnBatchText] = useState('');
  const [isbnBatchLoading, setIsbnBatchLoading] = useState(false);
  const [isbnBatchNotFound, setIsbnBatchNotFound] = useState<string[]>([]);
  const [isbnBatchFound, setIsbnBatchFound] = useState<{ isbn: string; title: string; coverImage: string; author: string }[]>([]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.cms(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchCms(token);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data) {
      setAllSelectedBooks(data.selectedBooks ?? {});
      setBannerUrl(data.selectedBooksBanner?.imageUrl ?? '');
      setBannerLink(data.selectedBooksBanner?.linkUrl ?? '/');
    }
  }, [data]);

  const patchMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/cms', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.cms() });
      toast.success('저장되었습니다.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

  const doSearch = useCallback(async (
    keyword: string,
    setter: typeof setBookResults,
    loadingSetter: typeof setSearchLoading,
  ) => {
    if (!user || keyword.trim().length < 1) return;
    loadingSetter(true);
    try {
      const token = await user.getIdToken();
      const results = await searchBooks(token, keyword.trim());
      setter(results);
    } catch {
      setter([]);
    } finally {
      loadingSetter(false);
    }
  }, [user]);

  const featuredBooks = data?.featuredBooks ?? [];
  const monthlyPick = data?.monthlyPick ?? null;

  // --- Featured Books handlers ---
  const handleReorder = (newItems: FeaturedBook[]) => {
    const withPriority = newItems.map((item, index) => ({ ...item, priority: index }));
    patchMutation.mutate({ featuredBooks: withPriority });
  };

  const handleAddFeaturedBook = (book: { isbn: string; title: string; coverImage: string }) => {
    if (featuredBooks.some((b) => b.isbn === book.isbn)) {
      toast.error('이미 추천 목록에 있는 도서입니다.');
      return;
    }
    const newList = [...featuredBooks, { ...book, priority: featuredBooks.length, recommendationText: '' }];
    patchMutation.mutate({ featuredBooks: newList });
    setAddBookOpen(false);
    setBookSearch('');
    setBookResults([]);
  };

  const handleRemoveFeaturedBook = (isbn: string) => {
    const newList = featuredBooks.filter((b) => b.isbn !== isbn).map((b, i) => ({ ...b, priority: i }));
    patchMutation.mutate({ featuredBooks: newList });
  };

  const handleSaveRecText = () => {
    if (!editingBook) return;
    const newList = featuredBooks.map((b) =>
      b.isbn === editingBook.isbn ? { ...b, recommendationText: editRecText } : b,
    );
    patchMutation.mutate({ featuredBooks: newList });
    setEditingBook(null);
  };

  // --- Monthly Pick handlers ---
  const handleSaveMonthlyPick = () => {
    if (!mpSelected) {
      toast.error('도서를 선택해 주세요.');
      return;
    }
    patchMutation.mutate({
      monthlyPick: { isbn: mpSelected.isbn, title: mpSelected.title, coverImage: mpSelected.coverImage, description: mpDescription },
    });
    setMonthlyPickOpen(false);
  };

  const handleRemoveMonthlyPick = () => {
    patchMutation.mutate({ monthlyPick: null });
  };

  // --- 선정도서 배너 handler ---
  const handleSaveBanner = () => {
    patchMutation.mutate({
      selectedBooksBanner: bannerUrl.trim()
        ? { imageUrl: bannerUrl.trim(), linkUrl: bannerLink.trim() || '/' }
        : null,
    });
  };

  // --- 학년별 선정도서 handlers ---
  const openGradeDialog = (key: GradeKey) => {
    setSelectedGradeKey(key);
    setGradeBooks(allSelectedBooks[key] ?? []);
    setGradeBookSearch('');
    setGradeBookResults([]);
    setGradeAddTab('search');
    setIsbnBatchText('');
    setIsbnBatchFound([]);
    setIsbnBatchNotFound([]);
    setGradeDialogOpen(true);
  };

  const handleSaveGrade = () => {
    const newAllSelectedBooks: AllSelectedBooks = {
      ...allSelectedBooks,
      [selectedGradeKey]: gradeBooks,
    };
    setAllSelectedBooks(newAllSelectedBooks);
    patchMutation.mutate({ selectedBooks: newAllSelectedBooks });
    setGradeDialogOpen(false);
  };

  const handleIsbnBatchLookup = useCallback(async () => {
    if (!user || !isbnBatchText.trim()) return;
    setIsbnBatchLoading(true);
    setIsbnBatchNotFound([]);
    setIsbnBatchFound([]);
    try {
      const token = await user.getIdToken();
      const isbns = isbnBatchText
        .split(/[\n,，\s]+/)
        .map((s) => s.replace(/-/g, '').trim())
        .filter((s) => /^\d{10,13}$/.test(s));
      if (isbns.length === 0) {
        toast.error('유효한 ISBN이 없습니다. 숫자 10~13자리로 입력해 주세요.');
        return;
      }
      const res = await fetch('/api/admin/books/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isbns }),
      });
      if (!res.ok) { toast.error('조회 실패'); return; }
      const json = await res.json();
      setIsbnBatchFound(json.found ?? []);
      setIsbnBatchNotFound(json.notFound ?? []);
    } catch {
      toast.error('조회 중 오류가 발생했습니다.');
    } finally {
      setIsbnBatchLoading(false);
    }
  }, [user, isbnBatchText]);

  const handleAddBatchToGrade = () => {
    const toAdd = isbnBatchFound.filter((b) => !gradeBooks.some((x) => x.isbn === b.isbn));
    if (toAdd.length === 0) { toast.error('이미 모두 추가된 도서입니다.'); return; }
    setGradeBooks((prev) => [...prev, ...toAdd.map(({ isbn, title, coverImage }) => ({ isbn, title, coverImage }))]);
    setIsbnBatchFound([]);
    setIsbnBatchNotFound([]);
    setIsbnBatchText('');
    toast.success(`${toAdd.length}권 추가되었습니다.`);
  };

  const selectedGradeLabel = GRADE_KEYS.find((g) => g.key === selectedGradeKey)?.label ?? selectedGradeKey;

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
        title="CMS 데이터를 불러올 수 없습니다"
        message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
      />
    );
  }

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">CMS 큐레이션</h1>

      {/* 1. MD 추천 도서 */}
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">MD 추천 도서 (독립서점 추천)</h2>
            <p className="text-sm text-muted-foreground mt-1">홈 페이지 큐레이션 섹션에 노출됩니다. 드래그로 순서 변경 가능.</p>
          </div>
          <Button onClick={() => { setAddBookOpen(true); setBookSearch(''); setBookResults([]); }}>
            도서 추가
          </Button>
        </div>
        {featuredBooks.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">등록된 추천 도서가 없습니다.</p>
          </div>
        ) : (
          <DragSortableList<FeaturedBook>
            items={featuredBooks}
            onReorder={handleReorder}
            getItemId={(item) => item.isbn}
            renderItem={(item) => (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <div className="relative w-12 h-16 shrink-0 rounded overflow-hidden bg-muted">
                  {item.coverImage && <AdminPreviewImage src={item.coverImage} alt="" fill className="object-cover" sizes="48px" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {item.recommendationText || '추천 문구 없음'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBook(item);
                      setEditRecText(item.recommendationText);
                    }}
                  >
                    편집
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFeaturedBook(item.isbn);
                    }}
                    disabled={patchMutation.isPending}
                  >
                    삭제
                  </Button>
                </div>
              </div>
            )}
          />
        )}
      </section>

      {/* 2. 이달의 책 */}
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">이달의 책</h2>
            <p className="text-sm text-muted-foreground mt-1">홈 페이지에 특별 추천으로 노출됩니다.</p>
          </div>
          <Button
            onClick={() => {
              setMonthlyPickOpen(true);
              setMpSearch('');
              setMpResults([]);
              setMpDescription(monthlyPick?.description ?? '');
              setMpSelected(monthlyPick ? { isbn: monthlyPick.isbn, title: monthlyPick.title, coverImage: monthlyPick.coverImage } : null);
            }}
          >
            {monthlyPick ? '변경' : '선정'}
          </Button>
        </div>
        {monthlyPick ? (
          <div className="flex items-center gap-4 rounded-lg border border-border p-4">
            <div className="relative w-16 h-22 shrink-0 rounded overflow-hidden bg-muted">
              {monthlyPick.coverImage && <AdminPreviewImage src={monthlyPick.coverImage} alt="" width={64} height={88} className="object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg">{monthlyPick.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{monthlyPick.description || '추천 글 없음'}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleRemoveMonthlyPick} disabled={patchMutation.isPending}>
              해제
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">이달의 책이 선정되지 않았습니다.</p>
          </div>
        )}
      </section>

      {/* 3. 선정도서 관리 */}
      <section className="rounded-lg border border-border bg-card p-5 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">선정도서 관리</h2>
          <p className="text-sm text-muted-foreground mt-1">학년별 선정도서와 배너를 관리합니다. 홈 및 선정도서 페이지에 노출됩니다.</p>
        </div>

        {/* 선정도서 배너 */}
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm">선정도서 배너</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md shrink-0">
              권장 사이즈: <strong>1400 × 280px</strong> (5:1 비율 · JPG/PNG/WEBP · 최대 5MB)
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">이미지 파일 업로드</Label>
              <ImagePreviewUploader
                storagePath="banners/selected-books"
                onUploadComplete={(url) => setBannerUrl(url)}
                onUploadingChange={(v) => setBannerUploading(v)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">이미지 URL (업로드 후 자동 입력 · 직접 입력도 가능)</Label>
              <Input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">클릭 링크 URL</Label>
              <Input
                value={bannerLink}
                onChange={(e) => setBannerLink(e.target.value)}
                placeholder="/selected-books"
                className="mt-1"
              />
            </div>
            {bannerUrl.trim() && (
              <div className="relative w-full aspect-[5/1] rounded-lg overflow-hidden bg-muted border border-border">
                <AdminPreviewImage src={bannerUrl} alt="배너 미리보기" fill className="object-cover" sizes="100vw" />
              </div>
            )}
          </div>
          <Button size="sm" onClick={handleSaveBanner} disabled={patchMutation.isPending || bannerUploading}>
            {bannerUploading ? '업로드 중...' : '배너 저장'}
          </Button>
        </div>

        {/* 학년별 선정도서 그리드 */}
        <div>
          <h3 className="font-medium text-sm mb-3">학년별 선정도서</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {GRADE_KEYS.map(({ key, label }) => {
              const bookCount = allSelectedBooks[key]?.length ?? 0;
              return (
                <div key={key} className="rounded-lg border border-border bg-background p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${bookCount > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {bookCount}권
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7"
                    onClick={() => openGradeDialog(key)}
                  >
                    편집
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dialog: 추천 도서 추가 */}
      <Dialog open={addBookOpen} onOpenChange={setAddBookOpen}>
        <DialogContent className="w-[90vw] max-w-[1200px] sm:max-w-[1200px] max-h-[90vh] min-w-0 overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>추천 도서 추가</DialogTitle>
          </DialogHeader>
          <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 gap-2">
              <Input
                className="min-w-0 flex-1"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="도서 제목 또는 ISBN — 입력하거나 붙여넣기"
                onKeyDown={(e) => e.key === 'Enter' && doSearch(bookSearch, setBookResults, setSearchLoading)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text').trim();
                  if (!text) return;
                  e.preventDefault();
                  setBookSearch(text);
                  setTimeout(() => doSearch(text, setBookResults, setSearchLoading), 0);
                }}
              />
              <Button onClick={() => doSearch(bookSearch, setBookResults, setSearchLoading)} disabled={searchLoading}>
                {searchLoading ? '검색중...' : '검색'}
              </Button>
            </div>
            {bookResults.length > 0 && (
              <ul className="max-h-[50vh] min-w-0 space-y-2 overflow-x-hidden overflow-y-auto">
                {bookResults.map((b) => (
                  <li
                    key={b.isbn}
                    className="flex min-w-0 cursor-pointer items-center gap-3 rounded border border-border p-2 hover:bg-muted/30"
                    onClick={() => handleAddFeaturedBook(b)}
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                      {b.coverImage && <AdminPreviewImage src={b.coverImage} alt="" fill className="object-cover" sizes="40px" />}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="line-clamp-2 text-sm font-medium break-words">{b.title}</p>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">
                        <span className="break-words">{b.author}</span>
                        {b.author ? ' · ' : null}
                        <span className="break-all">{b.isbn}</span>
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="shrink-0">
                      추가
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {bookResults.length === 0 && bookSearch && !searchLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">검색 결과가 없습니다.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: 추천 문구 편집 */}
      <Dialog open={!!editingBook} onOpenChange={(open) => !open && setEditingBook(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>추천 문구 편집</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="font-medium">{editingBook?.title}</p>
            <div>
              <Label>추천 문구</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editRecText}
                onChange={(e) => setEditRecText(e.target.value)}
                placeholder="이 도서를 추천하는 이유를 작성해 주세요..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBook(null)}>취소</Button>
            <Button onClick={handleSaveRecText} disabled={patchMutation.isPending}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: 이달의 책 선정 */}
      <Dialog open={monthlyPickOpen} onOpenChange={setMonthlyPickOpen}>
        <DialogContent className="w-[90vw] max-w-[1200px] sm:max-w-[1200px] max-h-[90vh] min-w-0 overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>이달의 책 선정</DialogTitle>
          </DialogHeader>
          <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 gap-2">
              <Input
                className="min-w-0 flex-1"
                value={mpSearch}
                onChange={(e) => setMpSearch(e.target.value)}
                placeholder="도서 제목 또는 ISBN — 입력하거나 붙여넣기"
                onKeyDown={(e) => e.key === 'Enter' && doSearch(mpSearch, setMpResults, setMpSearchLoading)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text').trim();
                  if (!text) return;
                  e.preventDefault();
                  setMpSearch(text);
                  setTimeout(() => doSearch(text, setMpResults, setMpSearchLoading), 0);
                }}
              />
              <Button onClick={() => doSearch(mpSearch, setMpResults, setMpSearchLoading)} disabled={mpSearchLoading}>
                {mpSearchLoading ? '검색중...' : '검색'}
              </Button>
            </div>
            {mpResults.length > 0 && (
              <ul className="max-h-40 min-w-0 space-y-2 overflow-x-hidden overflow-y-auto">
                {mpResults.map((b) => (
                  <li
                    key={b.isbn}
                    className={`flex min-w-0 cursor-pointer items-center gap-3 rounded border p-2 ${mpSelected?.isbn === b.isbn ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/30'}`}
                    onClick={() => setMpSelected({ isbn: b.isbn, title: b.title, coverImage: b.coverImage })}
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                      {b.coverImage && <AdminPreviewImage src={b.coverImage} alt="" fill className="object-cover" sizes="40px" />}
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <p className="line-clamp-2 text-sm font-medium break-words">{b.title}</p>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">{b.author}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {mpSelected && (
              <div className="rounded-lg border border-primary/50 bg-primary/5 p-3">
                <p className="text-sm font-medium">선택: {mpSelected.title}</p>
              </div>
            )}
            <div>
              <Label>추천 글</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={mpDescription}
                onChange={(e) => setMpDescription(e.target.value)}
                placeholder="이달의 책 추천 이유를 작성해 주세요..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMonthlyPickOpen(false)}>취소</Button>
            <Button onClick={handleSaveMonthlyPick} disabled={patchMutation.isPending || !mpSelected}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: 학년별 선정도서 편집 */}
      <Dialog open={gradeDialogOpen} onOpenChange={(open) => { if (!open) setGradeDialogOpen(false); }}>
        <DialogContent className="w-[90vw] max-w-[1200px] sm:max-w-[1200px] max-h-[92vh] min-w-0 overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>선정도서 편집 — {selectedGradeLabel}</DialogTitle>
          </DialogHeader>
          <div className="min-w-0 space-y-4">
            {/* 학년 선택 드롭다운 */}
            <div>
              <Label className="text-sm mb-1 block">학년 선택</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedGradeKey}
                onChange={(e) => {
                  const key = e.target.value as GradeKey;
                  setSelectedGradeKey(key);
                  setGradeBooks(allSelectedBooks[key] ?? []);
                  setGradeBookSearch('');
                  setGradeBookResults([]);
                  setIsbnBatchText('');
                  setIsbnBatchFound([]);
                  setIsbnBatchNotFound([]);
                }}
              >
                {GRADE_KEYS.map(({ key, label }) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* 도서 추가 탭 */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setGradeAddTab('search')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${gradeAddTab === 'search' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
                >
                  제목 / ISBN 검색
                </button>
                <button
                  type="button"
                  onClick={() => setGradeAddTab('batch')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${gradeAddTab === 'batch' ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground hover:bg-muted'}`}
                >
                  ISBN 일괄 입력 (40~50권)
                </button>
              </div>

              <div className="p-3">
                {gradeAddTab === 'search' ? (
                  <div className="min-w-0 space-y-2">
                    <div className="flex min-w-0 gap-2">
                      <Input
                        className="min-w-0 flex-1"
                        value={gradeBookSearch}
                        onChange={(e) => setGradeBookSearch(e.target.value)}
                        placeholder="도서 제목 또는 ISBN — 입력하거나 붙여넣기"
                        onKeyDown={(e) => e.key === 'Enter' && doSearch(gradeBookSearch, setGradeBookResults, setGradeBookSearchLoading)}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData('text').trim();
                          if (!text) return;
                          e.preventDefault();
                          const tokens = text.split(/[\s,，]+/).map((t) => t.replace(/-/g, '').trim()).filter(Boolean);
                          const isbnTokens = tokens.filter((t) => /^\d{10,13}$/.test(t));
                          if (isbnTokens.length > 1) {
                            setGradeAddTab('batch');
                            setIsbnBatchText(text);
                            return;
                          }
                          setGradeBookSearch(text);
                          setTimeout(() => doSearch(text, setGradeBookResults, setGradeBookSearchLoading), 0);
                        }}
                      />
                      <Button onClick={() => doSearch(gradeBookSearch, setGradeBookResults, setGradeBookSearchLoading)} disabled={gradeBookSearchLoading} size="sm">
                        {gradeBookSearchLoading ? '...' : '검색'}
                      </Button>
                    </div>
                    {gradeBookResults.length > 0 && (
                      <ul className="max-h-72 min-w-0 space-y-2 overflow-x-hidden overflow-y-auto">
                        {gradeBookResults.map((b) => {
                          const already = gradeBooks.some((x) => x.isbn === b.isbn);
                          return (
                            <li
                              key={b.isbn}
                              className={`flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors ${already ? 'border-primary/40 bg-primary/5 opacity-60' : 'border-border hover:bg-muted/30'}`}
                            >
                              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-muted">
                                {b.coverImage && <AdminPreviewImage src={b.coverImage} alt="" fill className="object-cover" sizes="48px" />}
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <p className="line-clamp-2 text-sm font-medium break-words">{b.title}</p>
                                <p className="mt-0.5 break-words text-xs text-muted-foreground">{b.author}</p>
                                <p className="break-all text-xs text-muted-foreground">{b.isbn}</p>
                              </div>
                              <Button
                                size="sm"
                                variant={already ? 'outline' : 'default'}
                                className="min-w-[64px] shrink-0"
                                disabled={already}
                                onClick={() => {
                                  if (!already) {
                                    setGradeBooks((prev) => [...prev, { isbn: b.isbn, title: b.title, coverImage: b.coverImage }]);
                                  }
                                }}
                              >
                                {already ? '추가됨' : '+ 추가'}
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">ISBN을 한 줄에 하나씩, 또는 쉼표로 구분하여 붙여넣기 하세요. (하이픈 포함 가능)</p>
                    <textarea
                      className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      value={isbnBatchText}
                      onChange={(e) => setIsbnBatchText(e.target.value)}
                      placeholder={'9788936434267\n9788936434274\n9791190853...\n...'}
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={handleIsbnBatchLookup} disabled={isbnBatchLoading || !isbnBatchText.trim()} size="sm">
                        {isbnBatchLoading ? '조회 중...' : 'ISBN 일괄 조회'}
                      </Button>
                      {isbnBatchFound.length > 0 && (
                        <Button onClick={handleAddBatchToGrade} size="sm" variant="default">
                          {isbnBatchFound.length}권 전체 추가
                        </Button>
                      )}
                    </div>
                    {isbnBatchFound.length > 0 && (
                      <div className="mt-1">
                        <p className="text-xs font-medium text-green-700 mb-1">조회됨 ({isbnBatchFound.length}권)</p>
                        <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
                          {isbnBatchFound.map((b) => (
                            <div key={b.isbn} className="flex items-center gap-2 p-1.5 rounded border border-green-200 bg-green-50">
                              <div className="relative w-7 h-10 shrink-0 rounded overflow-hidden bg-muted">
                                {b.coverImage && <AdminPreviewImage src={b.coverImage} alt="" fill className="object-cover" sizes="28px" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium truncate">{b.title}</p>
                                <p className="text-xs text-muted-foreground">{b.isbn}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {isbnBatchNotFound.length > 0 && (
                      <div className="mt-1">
                        <p className="text-xs font-medium text-destructive mb-1">미등록 / 비활성 ISBN ({isbnBatchNotFound.length}개)</p>
                        <p className="text-xs text-muted-foreground font-mono break-all">{isbnBatchNotFound.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 현재 추가된 도서 목록 */}
            {gradeBooks.length > 0 && (
              <div>
                <Label className="mb-2 block">추가된 도서 ({gradeBooks.length}권) — {selectedGradeLabel}</Label>
                <div className="grid grid-cols-3 gap-1.5 max-h-72 overflow-y-auto">
                  {gradeBooks.map((b, idx) => (
                    <div key={b.isbn} className="flex items-center gap-2 p-2 rounded border border-border bg-background">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="relative w-8 h-11 shrink-0 rounded overflow-hidden bg-muted">
                        {b.coverImage && <AdminPreviewImage src={b.coverImage} alt="" fill className="object-cover" sizes="32px" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate">{b.title}</p>
                        <p className="text-xs text-muted-foreground">{b.isbn}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 text-xs px-1"
                        onClick={() => setGradeBooks((prev) => prev.filter((x) => x.isbn !== b.isbn))}
                      >
                        제거
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>취소</Button>
            <Button onClick={handleSaveGrade} disabled={patchMutation.isPending}>
              {gradeBooks.length > 0 ? `저장 (${gradeBooks.length}권)` : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

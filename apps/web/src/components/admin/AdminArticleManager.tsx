'use client';

import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getArticleTypeLabel } from '@/lib/contentLabels';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';

const NOTICE_TYPE = 'notice';
const CONTENT_TYPES = [
  { value: 'author_interview', label: '작가 인터뷰' },
  { value: 'bookstore_story', label: '서점 이야기' },
  { value: 'publisher_story', label: '출판 이야기' },
] as const;

type AdminArticleMode = 'content' | 'notice';

interface ArticleRow {
  articleId: string;
  slug: string;
  type: string;
  title: string;
  thumbnailUrl: string;
  isPublished: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ArticleDetail extends ArticleRow {
  content: string;
}

function getDefaultType(mode: AdminArticleMode) {
  return mode === 'notice' ? NOTICE_TYPE : 'bookstore_story';
}

function createEmptyForm(mode: AdminArticleMode): Partial<ArticleDetail> {
  return {
    title: '',
    slug: '',
    type: getDefaultType(mode),
    content: '',
    thumbnailUrl: '',
    isPublished: true,
  };
}

async function fetchArticles(token: string): Promise<ArticleRow[]> {
  const res = await fetch('/api/admin/content', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function fetchArticle(token: string, id: string): Promise<ArticleDetail> {
  const res = await fetch(`/api/admin/content/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ko-KR');
}

function slugFromTitle(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3131-\u318E\uAC00-\uD7A3-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export default function AdminArticleManager({ mode }: { mode: AdminArticleMode }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [editingArticle, setEditingArticle] = useState<ArticleRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<ArticleDetail>>(createEmptyForm(mode));

  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.content(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchArticles(token);
    },
    enabled: !!user,
  });

  const isNoticeMode = mode === 'notice';
  const filteredArticles = articles.filter((article) =>
    isNoticeMode ? article.type === NOTICE_TYPE : article.type !== NOTICE_TYPE,
  );

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.content() });
      toast.success(isNoticeMode ? '공지사항이 등록되었습니다.' : '콘텐츠가 등록되었습니다.');
      setAdding(false);
      resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '등록에 실패했습니다.'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ articleId, payload }: { articleId: string; payload: Record<string, unknown> }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const res = await fetch(`/api/admin/content/${encodeURIComponent(articleId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.content() });
      toast.success(isNoticeMode ? '공지사항이 수정되었습니다.' : '콘텐츠가 수정되었습니다.');
      setEditingArticle(null);
      resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수정에 실패했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (articleId: string) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const res = await fetch(`/api/admin/content/${encodeURIComponent(articleId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.content() });
      toast.success(isNoticeMode ? '공지사항이 삭제되었습니다.' : '콘텐츠가 삭제되었습니다.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제에 실패했습니다.'),
  });

  function resetForm() {
    setForm(createEmptyForm(mode));
  }

  async function openEdit(article: ArticleRow) {
    if (!user) return;
    setEditingArticle(article);
    try {
      const token = await getAdminToken(user);
      const detail = await fetchArticle(token, article.articleId);
      setForm({
        title: detail.title,
        slug: detail.slug,
        type: detail.type,
        content: detail.content,
        thumbnailUrl: detail.thumbnailUrl,
        isPublished: detail.isPublished,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '상세 정보를 불러오지 못했습니다.');
    }
  }

  function handleTitleChange(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      ...(adding && !editingArticle ? { slug: slugFromTitle(title) } : {}),
    }));
  }

  function validateForm() {
    if (!form.title?.trim()) {
      toast.error('제목을 입력해 주세요.');
      return false;
    }
    if (!form.slug?.trim()) {
      toast.error('슬러그를 입력해 주세요.');
      return false;
    }
    if (!isNoticeMode && !form.thumbnailUrl?.trim()) {
      toast.error('대표 이미지를 업로드해 주세요.');
      return false;
    }
    return true;
  }

  function handleSubmitAdd() {
    if (!validateForm()) return;

    createMutation.mutate({
      title: form.title?.trim(),
      slug: form.slug?.trim().replace(/\s+/g, '-'),
      type: isNoticeMode ? NOTICE_TYPE : form.type ?? getDefaultType(mode),
      content: form.content ?? '',
      thumbnailUrl: form.thumbnailUrl?.trim() ?? '',
      isPublished: form.isPublished === true,
    });
  }

  function handleSubmitEdit() {
    if (!editingArticle) return;
    if (!validateForm()) return;

    updateMutation.mutate({
      articleId: editingArticle.articleId,
      payload: {
        title: form.title?.trim(),
        slug: form.slug?.trim().replace(/\s+/g, '-'),
        type: isNoticeMode ? NOTICE_TYPE : form.type,
        content: form.content ?? '',
        thumbnailUrl: form.thumbnailUrl?.trim() ?? '',
        isPublished: form.isPublished === true,
      },
    });
  }

  const pageTitle = isNoticeMode ? '공지사항 관리' : '콘텐츠 관리';
  const pageDescription = isNoticeMode
    ? '여기에서 등록한 글만 스토어 공지사항 페이지에 노출됩니다.'
    : '일반 콘텐츠만 관리합니다. 영상은 유튜브 메뉴에서 별도로 등록합니다.';

  if (error) {
    return (
      <main className="p-6">
        <EmptyState title="오류" message={error instanceof Error ? error.message : '목록을 불러오지 못했습니다.'} />
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{pageDescription}</p>
        </div>
        <Button
          onClick={() => {
            setAdding(true);
            setEditingArticle(null);
            resetForm();
          }}
        >
          {isNoticeMode ? '공지사항 등록' : '콘텐츠 등록'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중입니다...</p>
      ) : filteredArticles.length === 0 ? (
        <EmptyState
          title={isNoticeMode ? '등록된 공지사항이 없습니다' : '등록된 콘텐츠가 없습니다'}
          message={isNoticeMode ? '첫 공지사항을 등록해 주세요.' : '첫 콘텐츠를 등록해 주세요.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-b border-border p-3 text-left">제목</th>
                <th className="border-b border-border p-3 text-left">유형</th>
                <th className="border-b border-border p-3 text-left">슬러그</th>
                <th className="border-b border-border p-3 text-center">발행</th>
                <th className="border-b border-border p-3 text-left">수정일</th>
                <th className="border-b border-border p-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((article) => (
                <tr key={article.articleId} className="border-b border-border last:border-b-0">
                  <td className="p-3 font-medium">{article.title}</td>
                  <td className="p-3">{getArticleTypeLabel(article.type)}</td>
                  <td className="p-3 text-muted-foreground">{article.slug}</td>
                  <td className="p-3 text-center">
                    {article.isPublished ? (
                      <span className="text-green-600">발행</span>
                    ) : (
                      <span className="text-muted-foreground">비공개</span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{formatDate(article.updatedAt)}</td>
                  <td className="space-x-2 p-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => openEdit(article)}>
                      수정
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`"${article.title}" 항목을 삭제할까요?`)) {
                          deleteMutation.mutate(article.articleId);
                        }
                      }}
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

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNoticeMode ? '공지사항 등록' : '콘텐츠 등록'}</DialogTitle>
          </DialogHeader>
          <ArticleForm
            form={form}
            setForm={setForm}
            onTitleChange={handleTitleChange}
            isAdd
            noticeOnly={isNoticeMode}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              취소
            </Button>
            <Button onClick={handleSubmitAdd} disabled={createMutation.isPending}>
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingArticle} onOpenChange={(open) => !open && setEditingArticle(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNoticeMode ? '공지사항 수정' : '콘텐츠 수정'}</DialogTitle>
          </DialogHeader>
          <ArticleForm
            form={form}
            setForm={setForm}
            onTitleChange={handleTitleChange}
            isAdd={false}
            noticeOnly={isNoticeMode}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArticle(null)}>
              취소
            </Button>
            <Button onClick={handleSubmitEdit} disabled={updateMutation.isPending}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ArticleForm({
  form,
  setForm,
  onTitleChange,
  isAdd,
  noticeOnly,
}: {
  form: Partial<ArticleDetail>;
  setForm: Dispatch<SetStateAction<Partial<ArticleDetail>>>;
  onTitleChange: (title: string) => void;
  isAdd: boolean;
  noticeOnly: boolean;
}) {
  const sessionIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const coverPath = `contents/${sessionIdRef.current}-cover.jpg`;
  const bodyImagePath = `contents/${sessionIdRef.current}-body.jpg`;

  const insertBodyImage = (url: string) => {
    setForm((prev) => ({
      ...prev,
      content: `${prev.content?.trim() ?? ''}\n\n![](${url})\n`.trimStart(),
    }));
    toast.success('본문 이미지가 삽입되었습니다.');
  };

  return (
    <div className="grid gap-5 py-4">
      <div>
        <Label>제목</Label>
        <Input value={form.title ?? ''} onChange={(e) => onTitleChange(e.target.value)} placeholder="제목" />
      </div>

      <div>
        <Label>슬러그(URL 경로)</Label>
        <Input
          value={form.slug ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.replace(/\s+/g, '-') }))}
          placeholder="notice-title"
        />
        {isAdd ? (
          <p className="mt-1 text-xs text-muted-foreground">제목을 입력하면 자동으로 생성되며 직접 수정할 수 있습니다.</p>
        ) : null}
      </div>

      <div>
        <Label>유형</Label>
        {noticeOnly ? (
          <div className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">공지사항</div>
        ) : (
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2"
            value={form.type ?? 'bookstore_story'}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <Label>대표 이미지</Label>
        <ImagePreviewUploader
          storagePath={coverPath}
          onUploadComplete={(url) => setForm((prev) => ({ ...prev, thumbnailUrl: url }))}
        />
        {noticeOnly ? (
          <p className="mt-1 text-xs text-muted-foreground">공지사항은 대표 이미지 없이도 등록할 수 있습니다.</p>
        ) : null}
        {form.thumbnailUrl ? (
          <p className="mt-1 break-all text-xs text-muted-foreground">현재 이미지: {form.thumbnailUrl}</p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ImagePlus className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">본문 이미지 첨부</p>
        </div>
        <p className="mb-3 text-xs leading-5 text-muted-foreground">
          이미지를 업로드하면 본문 하단에 자동으로 삽입됩니다. 필요하면 이후 마크다운에서 위치를 조정하면 됩니다.
        </p>
        <ImagePreviewUploader storagePath={bodyImagePath} onUploadComplete={insertBodyImage} />
      </div>

      <div>
        <Label>본문(Markdown)</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          `## 제목`, `- 목록`, `[링크](URL)`, `![](이미지URL)` 형식을 사용할 수 있습니다.
        </p>
        <textarea
          className="min-h-[280px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          value={form.content ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
          placeholder="본문을 작성해 주세요."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isPublished"
          type="checkbox"
          checked={form.isPublished === true}
          onChange={(e) => setForm((prev) => ({ ...prev, isPublished: e.target.checked }))}
        />
        <Label htmlFor="isPublished">발행 상태로 저장</Label>
      </div>
    </div>
  );
}

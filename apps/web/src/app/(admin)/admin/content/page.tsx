'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { useState } from 'react';
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
import { getArticleTypeLabel } from '@/lib/contentLabels';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';

const ARTICLE_TYPES = [
  { value: 'author_interview', label: '작가 인터뷰' },
  { value: 'bookstore_story', label: '서점 이야기' },
  { value: 'publisher_story', label: '출판 이야기' },
] as const;

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
    .toLowerCase() || '';
}

export default function AdminContentPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [editingArticle, setEditingArticle] = useState<ArticleRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<ArticleDetail>>({
    title: '',
    slug: '',
    type: 'bookstore_story',
    content: '',
    thumbnailUrl: '',
    isPublished: false,
  });

  const { data: articles = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.content(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchArticles(token);
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
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
      toast.success('콘텐츠가 등록되었습니다.');
      setAdding(false);
      resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '등록 실패'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ articleId, payload }: { articleId: string; payload: Record<string, unknown> }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
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
      toast.success('수정되었습니다.');
      setEditingArticle(null);
      resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수정 실패'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (articleId: string) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
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
      toast.success('삭제되었습니다.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  });

  function resetForm() {
    setForm({
      title: '',
      slug: '',
      type: 'bookstore_story',
      content: '',
      thumbnailUrl: '',
      isPublished: false,
    });
  }

  async function openEdit(a: ArticleRow) {
    if (!user) return;
    setEditingArticle(a);
    try {
      const token = await user.getIdToken();
      const detail = await fetchArticle(token, a.articleId);
      setForm({
        title: detail.title,
        slug: detail.slug,
        type: detail.type,
        content: detail.content,
        thumbnailUrl: detail.thumbnailUrl,
        isPublished: detail.isPublished,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '불러오기 실패');
    }
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      ...(adding && !editingArticle ? { slug: slugFromTitle(title) } : {}),
    }));
  }

  function handleSubmitAdd() {
    if (!form.title?.trim() || !form.slug?.trim() || !form.thumbnailUrl?.trim()) {
      toast.error('제목, 슬러그, 썸네일 URL을 입력해 주세요.');
      return;
    }
    createMutation.mutate({
      title: form.title.trim(),
      slug: form.slug.trim().replace(/\s+/g, '-'),
      type: form.type ?? 'bookstore_story',
      content: form.content ?? '',
      thumbnailUrl: form.thumbnailUrl.trim(),
      isPublished: form.isPublished === true,
    });
  }

  function handleSubmitEdit() {
    if (!editingArticle) return;
    const payload: Record<string, unknown> = {};
    if (form.title !== undefined) payload.title = form.title.trim();
    if (form.slug !== undefined) payload.slug = form.slug.trim().replace(/\s+/g, '-');
    if (form.type !== undefined) payload.type = form.type;
    if (form.content !== undefined) payload.content = form.content;
    if (form.thumbnailUrl !== undefined) payload.thumbnailUrl = form.thumbnailUrl.trim();
    if (form.isPublished !== undefined) payload.isPublished = form.isPublished;
    if (Object.keys(payload).length === 0) {
      setEditingArticle(null);
      return;
    }
    updateMutation.mutate({ articleId: editingArticle.articleId, payload });
  }

  if (error) {
    return (
      <main className="p-6">
        <EmptyState title="오류" message={error instanceof Error ? error.message : '콘텐츠 목록을 불러올 수 없습니다.'} />
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">콘텐츠 관리</h1>
        <Button onClick={() => { setAdding(true); resetForm(); }}>콘텐츠 등록</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">로딩 중…</p>
      ) : articles.length === 0 ? (
        <EmptyState title="등록된 콘텐츠 없음" message="콘텐츠를 등록해 주세요." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border p-2 text-left">제목</th>
                <th className="border border-border p-2 text-left">유형</th>
                <th className="border border-border p-2 text-left">슬러그</th>
                <th className="border border-border p-2 text-center">발행</th>
                <th className="border border-border p-2 text-left">수정일</th>
                <th className="border border-border p-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((a) => (
                <tr key={a.articleId} className="border-b border-border">
                  <td className="border border-border p-2 font-medium">{a.title}</td>
                  <td className="border border-border p-2">{getArticleTypeLabel(a.type)}</td>
                  <td className="border border-border p-2 text-muted-foreground">{a.slug}</td>
                  <td className="border border-border p-2 text-center">
                    {a.isPublished ? (
                      <span className="text-green-600">발행</span>
                    ) : (
                      <span className="text-muted-foreground">미발행</span>
                    )}
                  </td>
                  <td className="border border-border p-2 text-muted-foreground">{formatDate(a.updatedAt)}</td>
                  <td className="border border-border p-2 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(a)}>수정</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`"${a.title}" 콘텐츠를 삭제할까요?`)) {
                          deleteMutation.mutate(a.articleId);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>콘텐츠 등록</DialogTitle>
          </DialogHeader>
          <ArticleForm form={form} setForm={setForm} onTitleChange={handleTitleChange} isAdd />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>취소</Button>
            <Button onClick={handleSubmitAdd} disabled={createMutation.isPending}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingArticle} onOpenChange={(open) => !open && setEditingArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>콘텐츠 수정</DialogTitle>
          </DialogHeader>
          <ArticleForm form={form} setForm={setForm} onTitleChange={handleTitleChange} isAdd={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArticle(null)}>취소</Button>
            <Button onClick={handleSubmitEdit} disabled={updateMutation.isPending}>저장</Button>
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
}: {
  form: Partial<ArticleDetail>;
  setForm: React.Dispatch<React.SetStateAction<Partial<ArticleDetail>>>;
  onTitleChange: (title: string) => void;
  isAdd: boolean;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div>
        <Label>제목</Label>
        <Input
          value={form.title ?? ''}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="제목"
        />
      </div>
      <div>
        <Label>슬러그 (URL 경로)</Label>
        <Input
          value={form.slug ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.replace(/\s+/g, '-') }))}
          placeholder="my-article"
        />
        {isAdd && (
          <p className="text-xs text-muted-foreground mt-1">제목에서 자동 생성되며 수정 가능합니다.</p>
        )}
      </div>
      <div>
        <Label>유형</Label>
        <select
          className="w-full border rounded-md px-3 py-2 bg-background"
          value={form.type ?? 'bookstore_story'}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
        >
          {ARTICLE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>썸네일 (이미지 업로드 · 5MB · JPEG/PNG/WEBP)</Label>
        <ImagePreviewUploader
          storagePath={`content/${Date.now()}.jpg`}
          onUploadComplete={(url) => setForm((f) => ({ ...f, thumbnailUrl: url }))}
        />
        {form.thumbnailUrl && (
          <p className="text-xs text-muted-foreground mt-1 break-all">현재: {form.thumbnailUrl}</p>
        )}
      </div>
      <div>
        <Label>본문 (마크다운)</Label>
        <div className="flex gap-2 mb-1">
          <span className="text-xs text-muted-foreground">**굵게**, *기울임*, ## 제목, - 목록, [링크](URL) 사용 가능</span>
        </div>
        <textarea
          className="w-full min-h-[250px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          value={form.content ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          placeholder="마크다운으로 작성..."
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublished"
          checked={form.isPublished === true}
          onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
        />
        <Label htmlFor="isPublished">발행 (목록 노출)</Label>
      </div>
    </div>
  );
}

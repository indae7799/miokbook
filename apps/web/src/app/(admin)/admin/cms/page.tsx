'use client';

import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import DragSortableList from '@/components/admin/DragSortableList';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';

interface FeaturedBook {
  isbn: string;
  title: string;
  coverImage: string;
  priority: number;
  recommendationText: string;
}

interface CmsHome {
  heroBanners: unknown[];
  featuredBooks: FeaturedBook[];
  monthlyPick: { isbn: string; title: string; coverImage: string; description: string } | null;
  themeCurations: unknown[];
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

export default function AdminCmsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.cms(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchCms(token);
    },
    enabled: !!user,
  });

  const patchMutation = useMutation({
    mutationFn: async (featuredBooks: FeaturedBook[]) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/cms', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ featuredBooks }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.cms() });
      toast.success('순서가 저장되었습니다.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

  const handleReorder = (newItems: FeaturedBook[]) => {
    const withPriority = newItems.map((item, index) => ({
      ...item,
      priority: index,
    }));
    patchMutation.mutate(withPriority);
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
        title="CMS 데이터를 불러올 수 없습니다"
        message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
      />
    );
  }

  const featuredBooks = data?.featuredBooks ?? [];

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">CMS</h1>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-medium mb-3">Featured Books (독립서점 추천) — 드래그로 순서 변경</h2>
        {featuredBooks.length === 0 ? (
          <p className="text-muted-foreground text-sm">등록된 추천 도서가 없습니다.</p>
        ) : (
          <DragSortableList<FeaturedBook>
            items={featuredBooks}
            onReorder={handleReorder}
            getItemId={(item) => item.isbn}
            renderItem={(item) => (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 min-h-[48px]">
                <div className="relative w-10 h-14 shrink-0 rounded overflow-hidden bg-muted">
                  <Image src={item.coverImage} alt="" fill className="object-cover" sizes="40px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{item.recommendationText || '—'}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">순서: {item.priority}</span>
              </div>
            )}
          />
        )}
        {featuredBooks.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            드래그로 순서를 바꾼 뒤 자동으로 cms/home에 반영됩니다.
          </p>
        )}
      </section>
    </main>
  );
}

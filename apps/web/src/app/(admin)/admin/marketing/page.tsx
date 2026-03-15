'use client';

import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import InternalLinkPicker from '@/components/admin/InternalLinkPicker';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const POSITION_OPTIONS = [
  { value: 'main_hero', label: '메인 히어로' },
  { value: 'main_top', label: '메인 상단' },
  { value: 'sidebar', label: '사이드바' },
] as const;

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  order: number;
}

interface PopupData {
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  endDate?: string | null;
}

interface CmsHome {
  heroBanners: Banner[];
  popup: PopupData | null;
  [key: string]: unknown;
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

export default function AdminMarketingPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [addingBanner, setAddingBanner] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({
    linkUrl: '/',
    position: 'main_hero',
    isActive: true,
    order: 0,
  });
  const [popupForm, setPopupForm] = useState<PopupData>({});

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
    mutationFn: async (payload: { heroBanners?: Banner[]; popup?: PopupData }) => {
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
      setAddingBanner(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

  const banners = data?.heroBanners ?? [];
  const popup = data?.popup ?? null;

  const handleAddBanner = () => {
    if (!newBanner.imageUrl || !newBanner.linkUrl || newBanner.position === undefined) {
      toast.error('이미지와 링크, 위치를 입력해 주세요.');
      return;
    }
    const nextOrder = banners.length;
    const banner: Banner = {
      id: newBanner.id ?? `banner_${Date.now()}`,
      imageUrl: newBanner.imageUrl,
      linkUrl: newBanner.linkUrl,
      position: newBanner.position as string,
      isActive: newBanner.isActive ?? true,
      startDate: newBanner.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: newBanner.endDate ?? null,
      order: newBanner.order ?? nextOrder,
    };
    patchMutation.mutate({ heroBanners: [...banners, banner] });
    setNewBanner({ linkUrl: '/', position: 'main_hero', isActive: true, order: banners.length + 1 });
  };

  const handleDeleteBanner = (id: string) => {
    patchMutation.mutate({ heroBanners: banners.filter((b) => b.id !== id) });
  };

  const handleSavePopup = () => {
    patchMutation.mutate({
      popup: {
        imageUrl: popupForm.imageUrl,
        linkUrl: popupForm.linkUrl ?? '/',
        isActive: popupForm.isActive,
        endDate: popupForm.endDate || null,
      },
    });
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
        title="데이터를 불러올 수 없습니다"
        message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
      />
    );
  }

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">배너 / 팝업</h1>

      {/* 배너 목록 — 메인 히어로 배너가 스토어 홈 상단 캐러셀에 노출됩니다 */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-medium mb-3">배너 목록 (홈 상단 메인 캐러셀)</h2>
        {banners.length === 0 && !addingBanner ? (
          <p className="text-muted-foreground text-sm mb-2">등록된 배너가 없습니다. 아래 &apos;배너 추가&apos;로 첫 메인 배너를 등록하면 스토어 홈 상단에 바로 노출됩니다.</p>
        ) : (
          <ul className="space-y-3">
            {banners.map((b) => (
              <li key={b.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                <div className="relative w-24 h-14 shrink-0 rounded overflow-hidden bg-muted">
                  <Image src={b.imageUrl} alt="" fill className="object-cover" sizes="96px" />
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p>{b.linkUrl}</p>
                  <p className="text-muted-foreground">{POSITION_OPTIONS.find((p) => p.value === b.position)?.label ?? b.position}</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteBanner(b.id)}
                  disabled={patchMutation.isPending}
                >
                  삭제
                </Button>
              </li>
            ))}
          </ul>
        )}

        {addingBanner ? (
          <div className="mt-4 p-4 rounded-lg border border-border space-y-3">
            <p className="text-sm font-medium">새 배너 (이미지 5MB·JPEG/PNG/WEBP)</p>
            <ImagePreviewUploader
              storagePath={`banners/${Date.now()}.jpg`}
              onUploadComplete={(url) => setNewBanner((prev) => ({ ...prev, imageUrl: url }))}
            />
            <div>
              <label className="text-sm text-muted-foreground">링크</label>
              <InternalLinkPicker
                value={newBanner.linkUrl ?? '/'}
                onChange={(url) => setNewBanner((prev) => ({ ...prev, linkUrl: url }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">위치</label>
              <select
                value={newBanner.position ?? 'main_hero'}
                onChange={(e) => setNewBanner((prev) => ({ ...prev, position: e.target.value }))}
                className="min-h-[48px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {POSITION_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddBanner} disabled={patchMutation.isPending || !newBanner.imageUrl}>
                저장
              </Button>
              <Button variant="outline" onClick={() => setAddingBanner(false)}>취소</Button>
            </div>
          </div>
        ) : (
          <Button className="mt-3 min-h-[48px]" onClick={() => setAddingBanner(true)}>
            배너 추가
          </Button>
        )}
      </section>

      {/* 팝업 관리 */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-medium mb-3">팝업 관리</h2>
        <div className="space-y-3 max-w-md">
          <div>
            <label className="text-sm text-muted-foreground">이미지 URL (또는 업로드 후 URL 입력)</label>
            <Input
              value={popupForm.imageUrl ?? popup?.imageUrl ?? ''}
              onChange={(e) => setPopupForm((p) => ({ ...p, imageUrl: e.target.value }))}
              placeholder="https://..."
              className="min-h-[48px]"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">링크</label>
            <InternalLinkPicker
              value={popupForm.linkUrl ?? (popup?.linkUrl || '/')}
              onChange={(url) => setPopupForm((p) => ({ ...p, linkUrl: url }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="popup-active"
              checked={popupForm.isActive ?? popup?.isActive ?? false}
              onChange={(e) => setPopupForm((p) => ({ ...p, isActive: e.target.checked }))}
              className="min-h-[48px] min-w-[48px]"
            />
            <label htmlFor="popup-active">활성</label>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">노출 종료일 (YYYY-MM-DD)</label>
            <Input
              type="date"
              value={popupForm.endDate ?? (popup?.endDate ?? '').slice(0, 10) ?? ''}
              onChange={(e) => setPopupForm((p) => ({ ...p, endDate: e.target.value || undefined }))}
              className="min-h-[48px]"
            />
          </div>
          <Button onClick={handleSavePopup} disabled={patchMutation.isPending} className="min-h-[48px]">
            팝업 저장
          </Button>
        </div>
      </section>
    </main>
  );
}

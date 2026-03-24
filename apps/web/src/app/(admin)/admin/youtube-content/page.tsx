'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { queryKeys } from '@/lib/queryKeys';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import type { YoutubeContent } from '@/types/youtube-content';
import { getYoutubeThumbnail } from '@/types/youtube-content';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import YoutubeContentForm from './YoutubeContentForm';
import EmptyState from '@/components/common/EmptyState';

async function fetchYoutubeContents(token: string): Promise<YoutubeContent[]> {
  const res = await fetch('/api/admin/youtube-content', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export default function AdminYoutubeContentPage() {
  useAdminGuard();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);
  const [editing, setEditing] = useState<YoutubeContent | null>(null);

  function openAddDialog() {
    setAddFormKey((k) => k + 1);
    setAdding(true);
  }

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.youtubeContent(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchYoutubeContents(token);
    },
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/youtube-content', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.youtubeContent() });
      toast.success('삭제되었습니다.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  });

  async function copyStoreUrl(slug: string) {
    const path = `/content/video/${encodeURIComponent(slug)}`;
    const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('스토어 주소를 복사했습니다.');
    } catch {
      toast.error('복사에 실패했습니다.');
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">유튜브 콘텐츠</h1>
          <p className="mt-1 text-sm text-gray-500">
            스토어 경로: <code className="rounded bg-gray-100 px-1">/content/video/슬러그</code>
          </p>
        </div>
        <Button onClick={openAddDialog}>새 콘텐츠</Button>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">빠른 안내</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900/90">
          <li>
            <strong>유튜브</strong> / <strong>웹하드·외부 링크</strong> 중 재생 방식을 고른 뒤 저장합니다. 웹하드
            &quot;페이지&quot;만 있으면 쇼핑몰에서는 새 창으로 열기만 됩니다.
          </li>
          <li>
            <strong>콘텐츠 목록 순서</strong>는 숫자가 작을수록 스토어 콘텐츠 페이지 「영상」에서 더 위에
            표시됩니다.
          </li>
        </ul>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : '목록을 불러오지 못했습니다.'}</p>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-gray-500">불러오는 중...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="등록된 유튜브 콘텐츠가 없습니다."
          message="첫 영상을 등록하면 스토어 콘텐츠 페이지에 표시할 수 있습니다."
          actionButton={{ label: '새 콘텐츠 추가', onClick: openAddDialog }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">순서</th>
                <th className="px-4 py-3 w-20">썸네일</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">슬러그</th>
                <th className="px-4 py-3">발행</th>
                <th className="px-4 py-3">미리보기</th>
                <th className="px-4 py-3 text-right">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((row, idx) => {
                const ytId = String(row.mainYoutubeId ?? '').trim();
                const hasExternal = Boolean(String(row.externalPlaybackUrl ?? '').trim());
                const externalOnly = !ytId && hasExternal;
                const thumbSrc =
                  row.customThumbnailUrl ||
                  (ytId ? getYoutubeThumbnail(ytId, 'default') : '');
                return (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3 text-gray-600 align-middle">{row.order}</td>
                  <td className="px-4 py-2 align-middle">
                    <div className="relative h-10 w-16 overflow-hidden rounded-md bg-gray-100">
                      {thumbSrc ? (
                        <Image
                          src={thumbSrc}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                          priority={idx === 0}
                          unoptimized={
                            Boolean(row.customThumbnailUrl) || thumbSrc.includes('ytimg.com')
                          }
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-wrap items-center gap-2 font-medium text-gray-900">
                      {externalOnly ? (
                        <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800">
                          외부
                        </span>
                      ) : null}
                      <span>{row.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 align-middle">{row.slug}</td>
                  <td className="px-4 py-3 align-middle">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.isPublished
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {row.isPublished ? '발행됨' : '초안'}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {row.isPublished ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/content/video/${encodeURIComponent(row.slug)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 underline hover:text-green-800"
                        >
                          열기
                        </Link>
                        <button
                          type="button"
                          onClick={() => void copyStoreUrl(row.slug)}
                          className="text-xs text-gray-600 underline hover:text-gray-900"
                        >
                          주소 복사
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">발행 후 미리보기</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right align-middle">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(row)}>
                      수정
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm('삭제할까요?')) removeMutation.mutate(row.id);
                      }}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>유튜브 콘텐츠 추가</DialogTitle>
          </DialogHeader>
          <YoutubeContentForm
            key={addFormKey}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.admin.youtubeContent() });
              toast.success('등록되었습니다.');
              setAdding(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>유튜브 콘텐츠 수정</DialogTitle>
          </DialogHeader>
          {editing ? (
            <YoutubeContentForm
              key={editing.id}
              initial={editing}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: queryKeys.admin.youtubeContent() });
                toast.success('저장되었습니다.');
                setEditing(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

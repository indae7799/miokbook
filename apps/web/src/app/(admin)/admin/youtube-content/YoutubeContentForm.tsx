'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  type YoutubeContent,
  type BookMeta,
  type YoutubeExposureTarget,
  extractYoutubeId,
  getYoutubeThumbnail,
  isLikelyDirectVideoUrl,
  isSafeHttpUrl,
  normalizeYoutubeExposureTargets,
} from '@/types/youtube-content';
import type { ChannelVideo } from '@/app/actions/youtube-channel';
import { useYoutubeContentAdmin } from '@/hooks/useYoutubeContentAdmin';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import VideoPickerModal from './_components/VideoPickerModal';

interface Props {
  initial?: YoutubeContent;
  onSuccess?: () => void;
}

type PickerTarget = 'main' | 'related' | null;

const EXPOSURE_OPTIONS: Array<{
  value: YoutubeExposureTarget;
  label: string;
  description: string;
}> = [
  { value: 'youtube', label: '유튜브', description: '스토어 메인과 콘텐츠 영상 페이지에 노출됩니다.' },
  { value: 'concert', label: '북콘서트', description: '북콘서트 페이지 후기 영상 영역에 노출됩니다.' },
];

function initialPlaybackMode(i?: YoutubeContent): 'youtube' | 'external' {
  if (!i) return 'youtube';
  const yt = (i.mainYoutubeId ?? '').trim();
  const ext = (i.externalPlaybackUrl ?? '').trim();
  if (ext && !yt) return 'external';
  return 'youtube';
}

export default function YoutubeContentForm({ initial, onSuccess }: Props) {
  const isEdit = !!initial;
  const { create, update, searchBooks, isLoading, error } = useYoutubeContentAdmin();

  const [playbackMode, setPlaybackMode] = useState<'youtube' | 'external'>(() =>
    initialPlaybackMode(initial)
  );
  const [externalPlaybackUrl, setExternalPlaybackUrl] = useState(initial?.externalPlaybackUrl ?? '');

  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [order, setOrder] = useState(initial?.order ?? 0);
  const [customThumbnailUrl, setCustomThumbnailUrl] = useState(initial?.customThumbnailUrl ?? '');
  const [exposureTargets, setExposureTargets] = useState<YoutubeExposureTarget[]>(
    normalizeYoutubeExposureTargets(initial?.exposureTargets)
  );

  const [mainVideo, setMainVideo] = useState<ChannelVideo | null>(() => {
    if (initialPlaybackMode(initial) === 'external') return null;
    return initial?.mainYoutubeId
      ? {
          videoId: initial.mainYoutubeId,
          title: '',
          description: '',
          thumbnail: getYoutubeThumbnail(initial.mainYoutubeId, 'mq'),
          publishedAt: '',
        }
      : null;
  });
  const [relatedVideos, setRelatedVideos] = useState<ChannelVideo[]>(() => {
    if (initialPlaybackMode(initial) === 'external') return [];
    return (initial?.relatedYoutubeIds ?? []).map((id) => ({
      videoId: id,
      title: '',
      description: '',
      thumbnail: getYoutubeThumbnail(id, 'mq'),
      publishedAt: '',
    }));
  });
  const [mainUrlInput, setMainUrlInput] = useState('');
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);

  const [selectedBooks, setSelectedBooks] = useState<BookMeta[]>([]);
  const [isbnQuery, setIsbnQuery] = useState('');
  const [bookResults, setBookResults] = useState<BookMeta[]>([]);
  const [isSearchingBooks, setIsSearchingBooks] = useState(false);

  useEffect(() => {
    if (!initial?.relatedIsbns?.length) return;
    fetch(`/api/admin/youtube-content/books?isbns=${initial.relatedIsbns.join(',')}`)
      .then((r) => r.json())
      .then((books: BookMeta[]) => {
        const sorted = initial.relatedIsbns
          .map((isbn) => books.find((b) => b.isbn === isbn))
          .filter((b): b is BookMeta => !!b);
        setSelectedBooks(sorted);
      })
      .catch(() => {});
  }, [initial?.id, initial?.relatedIsbns]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  async function handleBookSearch() {
    if (!isbnQuery.trim()) return;
    setIsSearchingBooks(true);
    const results = await searchBooks(isbnQuery.trim());
    setBookResults(results ?? []);
    setIsSearchingBooks(false);
  }

  function handleVideoSelect(video: ChannelVideo) {
    if (pickerTarget === 'main') {
      setMainVideo(video);
      if (!title.trim() && video.title) setTitle(video.title);
    } else if (pickerTarget === 'related') {
      setRelatedVideos((prev) => [...prev, video]);
    }
    setPickerTarget(null);
  }

  function applyMainUrlInput() {
    const id = extractYoutubeId(mainUrlInput.trim());
    if (!id) return;
    setMainVideo({
      videoId: id,
      title: mainUrlInput.trim(),
      description: '',
      thumbnail: getYoutubeThumbnail(id, 'mq'),
      publishedAt: '',
    });
    setMainUrlInput('');
  }

  function handleMainUrlBlur() {
    if (mainUrlInput.trim()) applyMainUrlInput();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const slugNorm = slug.trim().replace(/\s+/g, '-');
    if (!slugNorm) {
      toast.error('슬러그를 입력해 주세요.');
      return;
    }
    if (exposureTargets.length === 0) {
      toast.error('노출 위치를 하나 이상 선택해 주세요.');
      return;
    }

    let mainYoutubeId = '';
    let relatedYoutubeIds: string[] = [];
    let extOut = '';

    if (playbackMode === 'youtube') {
      if (!mainVideo) {
        toast.error('유튜브 메인 영상을 선택해 주세요.');
        return;
      }
      mainYoutubeId = mainVideo.videoId;
      relatedYoutubeIds = relatedVideos.map((v) => v.videoId);
    } else {
      const u = externalPlaybackUrl.trim();
      if (!u) {
        toast.error('외부 재생 주소를 입력해 주세요.');
        return;
      }
      if (!isSafeHttpUrl(u)) {
        toast.error('주소는 http:// 또는 https:// 로 시작해야 합니다.');
        return;
      }
      extOut = u;
    }

    const payload: Omit<YoutubeContent, 'id'> = {
      title: title.trim(),
      slug: slugNorm,
      description,
      isPublished,
      order,
      mainYoutubeId,
      relatedYoutubeIds,
      exposureTargets,
      relatedIsbns: selectedBooks.map((b) => b.isbn),
      publishedAt: initial?.publishedAt ?? new Date().toISOString(),
      externalPlaybackUrl: extOut,
      ...(customThumbnailUrl.trim() ? { customThumbnailUrl: customThumbnailUrl.trim() } : {}),
    };

    let ok = false;
    if (isEdit && initial?.id) {
      ok = await update(initial.id, payload);
    } else {
      const id = await create(payload);
      ok = Boolean(id);
    }

    if (ok) onSuccess?.();
  }

  const excludeIds = [
    ...(mainVideo ? [mainVideo.videoId] : []),
    ...relatedVideos.map((v) => v.videoId),
  ];

  return (
    <>
      {pickerTarget ? (
        <VideoPickerModal
          onSelect={handleVideoSelect}
          onClose={() => setPickerTarget(null)}
          excludeIds={excludeIds}
        />
      ) : null}

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-2xl space-y-8">
        <section className="space-y-4">
          <SectionTitle>기본 정보</SectionTitle>
          <div>
            <Label htmlFor="yt-title">제목 *</Label>
            <Input id="yt-title" className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <Label htmlFor="yt-slug">슬러그 *</Label>
                <Input
                  id="yt-slug"
                  className="mt-1 font-mono"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="vlog-2024-03"
                  required
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  const s = suggestSlugFromTitle(title);
                  if (s) setSlug(s);
                }}
              >
                제목으로 채우기
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              상세 페이지 주소: <span className="font-mono text-gray-600">/content/video/{slug || 'slug'}</span>
            </p>
          </div>
          <div>
            <Label htmlFor="yt-desc">설명</Label>
            <textarea
              id="yt-desc"
              className="mt-1 min-h-[96px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <Label htmlFor="yt-order">정렬 순서</Label>
              <Input
                id="yt-order"
                type="number"
                className="mt-1 w-28"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
            <div className="mt-6 space-y-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="size-4 rounded border"
                />
                스토어에 발행
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <Label>노출 위치</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXPOSURE_OPTIONS.map((option) => {
                const checked = exposureTargets.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                      checked ? 'border-[#722f37]/25 bg-[#fff8f4]' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setExposureTargets((prev) => {
                            if (e.target.checked) return Array.from(new Set([...prev, option.value]));
                            return prev.filter((value) => value !== option.value);
                          });
                        }}
                        className="mt-1 size-4 rounded border-gray-400"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{option.label}</p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500">두 항목을 모두 선택하면 두 페이지에 함께 노출됩니다.</p>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>재생 방식</SectionTitle>
          <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <legend className="sr-only">재생 방식 선택</legend>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="playback"
                  checked={playbackMode === 'youtube'}
                  onChange={() => {
                    setPlaybackMode('youtube');
                    setExternalPlaybackUrl('');
                  }}
                  className="size-4 border-gray-400"
                />
                유튜브 영상
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="playback"
                  checked={playbackMode === 'external'}
                  onChange={() => {
                    setPlaybackMode('external');
                    setMainVideo(null);
                    setMainUrlInput('');
                    setRelatedVideos([]);
                  }}
                  className="size-4 border-gray-400"
                />
                외부 링크
              </label>
            </div>

            {playbackMode === 'youtube' ? (
              <div className="space-y-3 border-t border-gray-200 pt-4">
                {mainVideo ? (
                  <div className="flex items-start gap-3 rounded-xl border bg-white p-3">
                    <Image
                      src={customThumbnailUrl || mainVideo.thumbnail}
                      alt={mainVideo.videoId}
                      width={140}
                      height={79}
                      className="shrink-0 rounded-lg object-cover"
                      unoptimized={Boolean(customThumbnailUrl) || mainVideo.thumbnail.includes('ytimg.com')}
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="line-clamp-2 font-medium">{mainVideo.title || mainVideo.videoId}</p>
                      <p className="mt-1 font-mono text-xs text-gray-400">{mainVideo.videoId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMainVideo(null)}
                      className="shrink-0 text-lg leading-none text-gray-300 hover:text-red-500"
                      aria-label="메인 영상 제거"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full py-6"
                      onClick={() => setPickerTarget('main')}
                    >
                      채널에서 메인 영상 선택
                    </Button>
                    <Input
                      value={mainUrlInput}
                      onChange={(e) => setMainUrlInput(e.target.value)}
                      onBlur={handleMainUrlBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          applyMainUrlInput();
                        }
                      }}
                      placeholder="또는 유튜브 URL 붙여넣기 후 Enter"
                    />
                  </div>
                )}

                <div>
                  <SectionTitle>추천 영상</SectionTitle>
                  {relatedVideos.length > 0 ? (
                    <div className="mt-2 grid grid-cols-3 gap-3">
                      {relatedVideos.map((video) => (
                        <div key={video.videoId} className="group relative">
                          <Image
                            src={video.thumbnail}
                            alt={video.videoId}
                            width={160}
                            height={90}
                            className="w-full rounded-lg object-cover"
                            unoptimized={video.thumbnail.includes('ytimg.com')}
                          />
                          <button
                            type="button"
                            onClick={() => setRelatedVideos((p) => p.filter((v) => v.videoId !== video.videoId))}
                            className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition hover:bg-red-500 group-hover:opacity-100"
                            aria-label="추천 영상 제거"
                          >
                            ×
                          </button>
                          <p className="mt-1 truncate font-mono text-xs text-gray-400">{video.videoId}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-full"
                    onClick={() => setPickerTarget('related')}
                  >
                    추천 영상 추가
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <Label htmlFor="yt-external-url">외부 재생 주소 *</Label>
                <Input
                  id="yt-external-url"
                  className="mt-1 font-mono text-sm"
                  value={externalPlaybackUrl}
                  onChange={(e) => setExternalPlaybackUrl(e.target.value)}
                  placeholder="https://..."
                />
                <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs leading-relaxed text-blue-950">
                  {externalPlaybackUrl.trim() && isSafeHttpUrl(externalPlaybackUrl.trim()) ? (
                    <p>
                      현재 주소는{' '}
                      {isLikelyDirectVideoUrl(externalPlaybackUrl.trim()) ? '직접 재생 가능한 파일 링크' : '외부 페이지 링크'}로 인식됩니다.
                    </p>
                  ) : (
                    <p>직접 파일 링크면 상세 페이지에서 재생을 시도하고, 일반 페이지 링크면 외부 이동 버튼으로 처리합니다.</p>
                  )}
                </div>
              </div>
            )}
          </fieldset>

          <div>
            <Label htmlFor="yt-thumb">커스텀 썸네일 URL</Label>
            <Input
              id="yt-thumb"
              className="mt-1"
              value={customThumbnailUrl}
              onChange={(e) => setCustomThumbnailUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {playbackMode === 'external' ? (
            <div className="space-y-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4">
              <Label>커스텀 썸네일 업로드</Label>
              <p className="text-xs leading-5 text-gray-500">
                외부 링크의 경우 썸네일을 자동으로 가져올 수 없으므로, 직접 업로드해 주시면 썸네일로 표시됩니다.
              </p>
              <ImagePreviewUploader
                storagePath="content"
                onUploadComplete={(url) => {
                  setCustomThumbnailUrl(url);
                  toast.success('썸네일이 업로드됐습니다.');
                }}
              />
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <SectionTitle>관련 도서</SectionTitle>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              value={isbnQuery}
              onChange={(e) => setIsbnQuery(e.target.value)}
              placeholder="책 제목 또는 ISBN"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), void handleBookSearch())}
            />
            <Button type="button" onClick={() => void handleBookSearch()} disabled={isSearchingBooks}>
              {isSearchingBooks ? '검색 중...' : '검색'}
            </Button>
          </div>
          {bookResults.length > 0 ? (
            <ul className="max-h-64 divide-y overflow-y-auto rounded-xl border bg-white shadow-sm">
              {bookResults.map((book) => (
                <li key={book.isbn}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBooks.find((b) => b.isbn === book.isbn)) {
                        setSelectedBooks((p) => [...p, book]);
                        setBookResults([]);
                        setIsbnQuery('');
                      }
                    }}
                    className="flex w-full gap-3 p-3 text-left hover:bg-gray-50"
                  >
                    <Image
                      src={book.cover}
                      alt={book.title}
                      width={36}
                      height={52}
                      className="shrink-0 rounded object-cover"
                      unoptimized={book.source === 'aladin'}
                    />
                    <div className="min-w-0 text-sm">
                      <p className="line-clamp-1 font-medium">{book.title}</p>
                      <p className="text-xs text-gray-400">
                        {book.author} · {book.publisher}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {selectedBooks.length > 0 ? (
            <ul className="space-y-2">
              {selectedBooks.map((book) => (
                <li key={book.isbn} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <Image
                    src={book.cover}
                    alt={book.title}
                    width={36}
                    height={52}
                    className="shrink-0 rounded object-cover"
                    unoptimized={book.source === 'aladin'}
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="line-clamp-1 font-medium">{book.title}</p>
                    <p className="text-xs text-gray-400">{book.author}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBooks((p) => p.filter((b) => b.isbn !== book.isbn))}
                    className="text-lg leading-none text-gray-300 hover:text-red-500"
                    aria-label="도서 제거"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? '저장 중...' : isEdit ? '수정 저장' : '콘텐츠 등록'}
        </Button>
      </form>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{children}</h3>;
}

function suggestSlugFromTitle(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const slug = t
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
  return slug || `video-${Date.now()}`;
}

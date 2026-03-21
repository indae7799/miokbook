'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  type YoutubeContent,
  type BookMeta,
  extractYoutubeId,
  getYoutubeThumbnail,
  isLikelyDirectVideoUrl,
  isSafeHttpUrl,
} from '@/types/youtube-content';
import type { ChannelVideo } from '@/app/actions/youtube-channel';
import { useYoutubeContentAdmin } from '@/hooks/useYoutubeContentAdmin';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import VideoPickerModal from './_components/VideoPickerModal';

interface Props {
  initial?: YoutubeContent;
  onSuccess?: () => void;
}

type PickerTarget = 'main' | 'related' | null;

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
  }, [initial?.id]);

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
      extOut = '';
    } else {
      const u = externalPlaybackUrl.trim();
      if (!u) {
        toast.error('외부 재생 주소(웹하드·파일 링크)를 입력해 주세요.');
        return;
      }
      if (!isSafeHttpUrl(u)) {
        toast.error('주소는 http:// 또는 https:// 로 시작해야 합니다.');
        return;
      }
      mainYoutubeId = '';
      relatedYoutubeIds = [];
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
            <p className="mt-1 text-xs text-gray-500">스토어 목록·상세에 표시되는 제목입니다.</p>
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
                  else toast.info('제목을 먼저 입력한 뒤 다시 시도해 주세요.');
                }}
              >
                제목에서 채우기
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              주소에 쓰입니다: <span className="font-mono text-gray-600">/content/video/슬러그</span> · 등록 후에는
              바꾸면 기존 링크가 깨질 수 있어요.
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
              <Label htmlFor="yt-order">콘텐츠 목록 순서</Label>
              <Input
                id="yt-order"
                type="number"
                className="mt-1 w-28"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
              <p className="mt-1 max-w-md text-xs text-gray-500">
                스토어 <span className="font-medium text-gray-700">콘텐츠</span> 페이지의 「영상」 칸에서{' '}
                <strong>위에서 아래로</strong> 정렬될 때 기준이 되는 번호입니다.{' '}
                <span className="text-gray-600">0이 맨 위, 1·2·3… 순으로 내려갑니다.</span> 같은 숫자면 저장 순서에
                따라 섞일 수 있으니 가능하면 0, 1, 2처럼 겹치지 않게 쓰는 것이 좋습니다.
              </p>
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
              <p className="text-xs text-gray-500 pl-6">
                켜야만 홈이 아닌 <span className="font-medium">콘텐츠</span> 페이지와 상세 URL에서 보입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>재생 방식</SectionTitle>
          <fieldset className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <legend className="sr-only">재생 소스 선택</legend>
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
                외부 링크 (웹하드·직접 파일 등)
              </label>
            </div>

            {playbackMode === 'youtube' ? (
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500">
                  상세 페이지 상단에 유튜브 플레이어로 재생됩니다. 채널에서 고르거나 URL을 붙여 넣을 수 있습니다.
                </p>
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
                      ✕
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
                      내 채널에서 영상 선택
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
                  <SectionTitle>하단 추천 영상 (유튜브만)</SectionTitle>
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
                            aria-label="제거"
                          >
                            ✕
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
                  <p className="font-medium text-blue-900">웹하드만 있는 경우</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-blue-900/90">
                    <li>
                      <strong>파일로 바로 열리는 주소</strong>(보통 <span className="font-mono">.mp4</span>,{' '}
                      <span className="font-mono">.webm</span> 등으로 끝남)를 넣으면 쇼핑몰 상세 페이지에서 그대로
                      재생을 시도합니다. (서버에서 CORS·hotlink 차단을 하면 재생이 안 될 수 있습니다.)
                    </li>
                    <li>
                      <strong>로그인 후 목록만 보이는 웹하드 &quot;페이지&quot; 주소</strong>만 있으면, 보안상 사이트 안에
                      영상을 끼울 수 없습니다. 그때는 지금 넣은 링크로{' '}
                      <strong>「외부 사이트에서 영상 열기」</strong> 버튼이 뜨고, 누르면 새 창에서 웹하드로
                      이동합니다.
                    </li>
                    <li>
                      웹하드가 직접 링크를 안 주면, 유튜브 등에 올리거나 호스팅에{' '}
                      <strong>공개 다운로드/스트리밍 URL</strong>을 만든 뒤 그 주소를 쓰는 편이 가장 수월합니다.
                    </li>
                  </ul>
                  {externalPlaybackUrl.trim() && isSafeHttpUrl(externalPlaybackUrl.trim()) ? (
                    <p className="mt-2 text-blue-800">
                      현재 주소는{' '}
                      {isLikelyDirectVideoUrl(externalPlaybackUrl.trim()) ? (
                        <span className="font-medium">직접 재생 링크로 보입니다.</span>
                      ) : (
                        <span className="font-medium">페이지/일반 링크로 보입니다. (새 창 열기 형태로 표시됩니다)</span>
                      )}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </fieldset>

          <div>
            <Label htmlFor="yt-thumb">커스텀 썸네일 URL (선택)</Label>
            <Input
              id="yt-thumb"
              className="mt-1"
              value={customThumbnailUrl}
              onChange={(e) => setCustomThumbnailUrl(e.target.value)}
              placeholder={
                playbackMode === 'youtube'
                  ? '비우면 유튜브 기본 썸네일'
                  : '목록·상단 미리보기용 (특히 웹하드 페이지 링크일 때 권장)'
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              콘텐츠 목록 카드에 쓰입니다. 외부 링크만 쓰는 경우 유튜브 썸네일이 없으므로, 가능하면 이미지 URL을
              넣어 주세요.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>관련 도서</SectionTitle>
          <p className="text-xs text-gray-400">자사 도서 DB 우선 검색. 없으면 알라딘 결과가 함께 표시됩니다.</p>
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
                      <div className="flex items-center gap-2">
                        <p className="line-clamp-1 font-medium">{book.title}</p>
                        {book.source === 'aladin' ? (
                          <span className="shrink-0 rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-600">
                            알라딘
                          </span>
                        ) : null}
                      </div>
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
                    aria-label="제거"
                  >
                    ✕
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

/** 제목으로 URL용 슬러그 초안 (한글·영문·숫자 허용, 공백→하이픈) */
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

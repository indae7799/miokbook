'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { YoutubeContentListItem } from '@/lib/youtube-store';
import { youtubeEmbedUrl } from '@/lib/youtube-embed-url';
import { getYoutubeThumbnail } from '@/types/youtube-content';
import { YoutubePlayTapArea } from '@/components/content/youtube-style-play';

function youtubePosterCandidates(item: Pick<YoutubeContentListItem, 'youtubeId' | 'thumbnailUrl'>) {
  if (!item.youtubeId) {
    return item.thumbnailUrl ? [item.thumbnailUrl] : [];
  }

  const candidates = [
    getYoutubeThumbnail(item.youtubeId, 'maxres'),
    getYoutubeThumbnail(item.youtubeId, 'sd'),
    getYoutubeThumbnail(item.youtubeId, 'hq'),
    item.thumbnailUrl,
  ];

  return Array.from(new Set(candidates.filter(Boolean)));
}

function YoutubePosterImage({
  item,
  alt,
  sizes,
  className,
}: {
  item: Pick<YoutubeContentListItem, 'youtubeId' | 'thumbnailUrl'>;
  alt: string;
  sizes: string;
  className: string;
}) {
  const candidates = useMemo(() => youtubePosterCandidates(item), [item]);
  const [index, setIndex] = useState(0);
  const src = candidates[index];

  if (!src) return null;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      unoptimized={src.includes('ytimg.com')}
      onError={() => setIndex((current) => (current < candidates.length - 1 ? current + 1 : current))}
    />
  );
}

interface Props {
  items: YoutubeContentListItem[];
  autoplayMutedOnMount?: boolean;
}

function summarize(text?: string, max = 120) {
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '영상 소개가 아직 준비되지 않았습니다. 상세 페이지에서 전체 내용을 확인해 주세요.';
  }
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

export default function YoutubeShowcaseSection({ items, autoplayMutedOnMount = false }: Props) {
  const playableItems = useMemo(
    () => items.filter((item) => item.youtubeId || item.externalPlaybackUrl),
    [items],
  );
  const [activeId, setActiveId] = useState(playableItems[0]?.id ?? items[0]?.id ?? '');
  const [isPlaying, setIsPlaying] = useState(autoplayMutedOnMount);

  if (items.length === 0) return null;

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  const activeDetailHref = `/content/video/${encodeURIComponent(activeItem.slug)}`;
  const canEmbedYoutube = Boolean(activeItem.youtubeId);
  const hasExternalPlayback = Boolean(activeItem.externalPlaybackUrl);
  const recommendedItems = items.filter((item) => item.id !== activeItem.id).slice(0, 3);
  const hasMainPoster = youtubePosterCandidates(activeItem).length > 0;

  return (
    <section className="rounded-[28px] border border-[#2f241f]/10 bg-[#fcfaf6] px-4 py-4 shadow-[0_20px_50px_-38px_rgba(36,24,21,0.28)] sm:px-5 sm:py-5 lg:px-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.62fr)_minmax(320px,0.78fr)] xl:items-start">
        <article className="mx-auto min-w-0 w-full max-w-[560px] self-start overflow-hidden rounded-[24px] border border-black/8 bg-[#15110f] shadow-[0_26px_60px_-42px_rgba(0,0,0,0.72)] xl:mx-0 xl:max-w-[540px]">
          {isPlaying && canEmbedYoutube ? (
            <iframe
              key={activeItem.id}
              src={youtubeEmbedUrl(activeItem.youtubeId, { autoplay: true })}
              title={activeItem.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="aspect-[16/10] w-full"
            />
          ) : (
            <div className="relative block aspect-[16/10] w-full overflow-hidden text-left">
              {hasMainPoster ? (
                <YoutubePosterImage
                  item={activeItem}
                  alt={activeItem.title}
                  sizes="(max-width: 1279px) 100vw, 760px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%),linear-gradient(180deg,#2a211d_0%,#161210_100%)]" />
              )}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,8,0.55)_0%,rgba(10,8,8,0.08)_42%,rgba(10,8,8,0.2)_100%)]" />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pb-20 pt-4 sm:px-5 sm:pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">Main Video</p>
                <p className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white drop-shadow-md sm:text-xl">
                  {activeItem.title}
                </p>
              </div>

              {canEmbedYoutube ? (
                <YoutubePlayTapArea label={`${activeItem.title} 재생`} onActivate={() => setIsPlaying(true)} />
              ) : hasExternalPlayback ? (
                <YoutubePlayTapArea
                  label={`${activeItem.title} 상세 페이지로 이동`}
                  href={activeDetailHref}
                />
              ) : null}

              {!hasMainPoster ? (
                <div className="pointer-events-none absolute left-5 top-5 z-10 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium text-white/82 backdrop-blur-sm">
                  기본 화면
                </div>
              ) : null}
            </div>
          )}
        </article>

        <aside className="hidden min-w-0 gap-5 grid-cols-1 md:grid">
          <section className="border-t border-[#722f37]/28 pt-4">
            <h3 className="font-myeongjo text-[20px] font-semibold leading-[1.35] text-[#201714]">
              {activeItem.title}
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-[#62514a] sm:text-sm">
              {summarize(activeItem.description, 120)}
            </p>
            <Link
              href={activeDetailHref}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#722f37]"
            >
              자세히 보기 <ChevronRight className="size-4" />
            </Link>
          </section>

          <section className="border-t border-[#722f37]/18 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d6e5a]">More Videos</p>
              <span className="text-[11px] text-[#8d7567]">추천 3개</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {recommendedItems.map((item) => {
                const hasPoster = youtubePosterCandidates(item).length > 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      setIsPlaying(false);
                    }}
                    className="group flex w-full flex-col text-left transition-opacity hover:opacity-100"
                  >
                    <div className="border-b border-[#722f37]/12 pb-3 md:border-b-0 md:border-r md:pr-4 last:md:border-r-0 last:md:pr-0">
                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[14px] bg-[#e8ddd1]">
                        {hasPoster ? (
                          <YoutubePosterImage
                            item={item}
                            alt={item.title}
                            sizes="(max-width: 767px) 100vw, 240px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,#ecdfd1_0%,#d9c7b4_100%)]" />
                        )}
                      </div>
                      <div className="pt-2.5">
                        <p className="line-clamp-2 text-[14px] font-medium leading-5 text-[#231916]">
                          {item.title}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

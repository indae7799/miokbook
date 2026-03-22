'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, Play } from 'lucide-react';
import type { YoutubeContentListItem } from '@/lib/youtube-store';
import { youtubeEmbedUrl } from '@/lib/youtube-embed-url';
import { getYoutubeThumbnail } from '@/types/youtube-content';

/** 쇼케이스는 커스텀 썸네일 대신 유튜브가 제공하는 기본(공식) 정지 화면을 씁니다. */
function officialYoutubePoster(item: Pick<YoutubeContentListItem, 'youtubeId' | 'thumbnailUrl'>) {
  return item.youtubeId ? getYoutubeThumbnail(item.youtubeId, 'hq') : item.thumbnailUrl;
}

interface Props {
  items: YoutubeContentListItem[];
  autoplayMutedOnMount?: boolean;
}

function summarize(text?: string, max = 120) {
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '\uC601\uC0C1 \uC18C\uAC1C\uAC00 \uC544\uC9C1 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uC0C1\uC138 \uD398\uC774\uC9C0\uC5D0\uC11C \uC804\uCCB4 \uB0B4\uC6A9\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.';
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
  const canEmbedYoutube = Boolean(activeItem.youtubeId);
  const hasExternalPlayback = Boolean(activeItem.externalPlaybackUrl);
  const recommendedItems = items.filter((item) => item.id !== activeItem.id).slice(0, 3);
  const mainPosterUrl = officialYoutubePoster(activeItem);

  return (
    <section className="rounded-[28px] border border-[#2f241f]/10 bg-[#fcfaf6] px-4 py-4 shadow-[0_20px_50px_-38px_rgba(36,24,21,0.28)] sm:px-5 sm:py-5 lg:px-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.62fr)_minmax(320px,0.78fr)] xl:items-start">
        <article className="mx-auto min-w-0 max-w-[560px] self-start overflow-hidden rounded-[24px] border border-black/8 bg-[#15110f] shadow-[0_26px_60px_-42px_rgba(0,0,0,0.72)] xl:mx-0 xl:max-w-[540px]">
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
              {mainPosterUrl ? (
                <Image
                  src={mainPosterUrl}
                  alt={activeItem.title}
                  fill
                  sizes="(max-width: 1279px) 100vw, 760px"
                  className="object-cover"
                  unoptimized={
                    mainPosterUrl.includes('ytimg.com') || mainPosterUrl.includes('/uploads/')
                  }
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%),linear-gradient(180deg,#2a211d_0%,#161210_100%)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,8,0.02)_0%,rgba(10,8,8,0.28)_100%)]" />

              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-5 sm:left-5 sm:right-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">Main Video</p>
                  <p className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-white sm:text-xl">
                    {activeItem.title}
                  </p>
                </div>
                {canEmbedYoutube ? (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="flex shrink-0 items-center gap-3 rounded-full bg-white/92 px-4 py-2 text-[#2f241f] shadow-[0_14px_30px_rgba(0,0,0,0.14)]"
                    aria-label={`${activeItem.title} \uC7AC\uC0DD`}
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#2f241f] text-white">
                      <Play className="ml-0.5 size-3.5 fill-current" />
                    </span>
                    <span className="text-sm font-medium">{'\uC601\uC0C1 \uC7AC\uC0DD'}</span>
                  </button>
                ) : hasExternalPlayback ? (
                  <Link
                    href={`/content/video/${activeItem.slug}`}
                    className="flex shrink-0 items-center gap-3 rounded-full bg-white/92 px-4 py-2 text-[#2f241f] shadow-[0_14px_30px_rgba(0,0,0,0.14)]"
                  >
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#2f241f] text-white">
                      <ExternalLink className="size-3.5" />
                    </span>
                    <span className="text-sm font-medium">{'\uC0C1\uC138 \uBCF4\uAE30'}</span>
                  </Link>
                ) : null}
              </div>

              {!mainPosterUrl ? (
                <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium text-white/82 backdrop-blur-sm">
                  {'\uAE30\uBCF8 \uD654\uBA74'}
                </div>
              ) : null}
            </div>
          )}
        </article>

        <aside className="grid min-w-0 gap-4 grid-cols-1">
          <section className="border-t border-[#2f241f]/12 pt-4">
            <h3 className="font-myeongjo text-[20px] font-semibold leading-[1.35] text-[#201714]">
              {activeItem.title}
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-[#62514a] sm:text-sm">
              {summarize(activeItem.description, 120)}
            </p>
          </section>

          <section className="border-t border-[#2f241f]/12 pt-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d6e5a]">More Videos</p>
              <span className="text-[11px] text-[#8d7567]">{'\uCD94\uCC9C 3\uAC1C'}</span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-0 md:grid-cols-3">
              {recommendedItems.map((item) => {
                const recPoster = officialYoutubePoster(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      setIsPlaying(false);
                    }}
                    className="group flex w-full flex-col text-left transition-opacity hover:opacity-100 md:px-4 first:md:pl-0 last:md:pr-0"
                  >
                    <div className="border-b border-[#2f241f]/12 pb-3 md:border-b-0 md:border-r md:pb-0 last:md:border-r-0">
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#e8ddd1]">
                        {recPoster ? (
                          <Image
                            src={recPoster}
                            alt={item.title}
                            fill
                            sizes="(max-width: 767px) 100vw, 240px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            unoptimized={
                              recPoster.includes('ytimg.com') || recPoster.includes('/uploads/')
                            }
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

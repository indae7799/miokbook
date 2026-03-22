'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import type { YoutubeContentListItem } from '@/lib/youtube-store';

interface Props {
  items: YoutubeContentListItem[];
}

function makeEmbedUrl(videoId: string) {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube.com/embed/${videoId}?${params}`;
}

function summarize(text: string, max = 120) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '책과 사람, 취향과 문장을 잇는 미옥서원의 영상 선집입니다.';
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

function noteText(index: number) {
  const labels = ['먼저 보기', '이어 보기', '다음 장면'];
  return labels[index] ?? '추천';
}

export default function YoutubeShowcaseSection({ items }: Props) {
  const playableItems = useMemo(() => items.filter((item) => item.youtubeId), [items]);
  const [activeId, setActiveId] = useState(playableItems[0]?.id ?? items[0]?.id ?? '');
  const [isPlaying, setIsPlaying] = useState(false);

  if (items.length === 0) return null;

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  const recommendedItems = items.filter((item) => item.id !== activeItem.id).slice(0, 3);

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-[#2f241f]/8 bg-[linear-gradient(180deg,#f7f2ea_0%,#fbf9f4_100%)] px-4 py-5 shadow-[0_24px_80px_-54px_rgba(36,24,21,0.32)] sm:px-6 sm:py-6 lg:px-8 lg:py-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(47,36,31,0.08),transparent)]" />

      <div className="mb-6 flex flex-col gap-4 border-b border-[#2f241f]/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#76584a]">Miok Seowon Moving Shelf</p>
          <h2 className="mt-3 font-myeongjo text-[30px] font-bold leading-[1.22] tracking-tight text-[#201815] sm:text-[38px]">
            책으로 들어가기 전에
            <br />
            먼저 머물게 되는 몇 장면
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#62514a] sm:text-[15px]">
            과하게 떠들지 않고, 조용히 오래 남는 영상을 앞에 두었습니다.
            한 편은 바로 재생하고, 곁에는 자연스럽게 이어 볼 장면을 놓았습니다.
          </p>
        </div>

        <Link
          href="/content"
          className="inline-flex h-10 items-center justify-center gap-1 self-start rounded-full border border-[#2f241f]/10 bg-white/88 px-4 text-sm font-medium text-[#3b2e28] transition-colors hover:bg-white"
        >
          전체 보기 <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.36fr)_320px] xl:grid-cols-[minmax(0,1.48fr)_348px]">
        <article className="min-w-0 rounded-[28px] border border-black/5 bg-white/86 p-3 shadow-[0_20px_60px_-42px_rgba(36,24,21,0.28)] sm:p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_232px]">
            <div className="min-w-0">
              <div className="overflow-hidden rounded-[24px] bg-[#181311]">
                {isPlaying ? (
                  <iframe
                    key={activeItem.id}
                    src={makeEmbedUrl(activeItem.youtubeId)}
                    title={activeItem.title}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="aspect-video w-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="group relative block aspect-video w-full overflow-hidden"
                    aria-label={`${activeItem.title} 재생`}
                  >
                    {activeItem.thumbnailUrl ? (
                      <Image
                        src={activeItem.thumbnailUrl}
                        alt={activeItem.title}
                        fill
                        sizes="(max-width: 1280px) 100vw, 900px"
                        className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        unoptimized={activeItem.thumbnailUrl.includes('ytimg.com')}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,7,7,0.1)_0%,rgba(8,7,7,0.52)_100%)]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-3 rounded-full bg-white/94 px-5 py-3 text-[#2f241f] shadow-[0_16px_36px_rgba(0,0,0,0.16)] transition-transform duration-300 group-hover:scale-[1.02]">
                        <span className="flex size-10 items-center justify-center rounded-full bg-[#2f241f] text-white">
                          <Play className="ml-0.5 size-4 fill-current" />
                        </span>
                        <span className="text-sm font-medium">바로 보기</span>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              <div className="px-1 pb-1 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">Selected Video</p>
                <h3 className="mt-3 max-w-3xl font-myeongjo text-[28px] font-bold leading-[1.26] tracking-tight text-[#201714] sm:text-[33px]">
                  {activeItem.title}
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#62514a] sm:text-[15px]">
                  {summarize(activeItem.description, 150)}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/content/video/${activeItem.slug}`}
                    className="inline-flex h-10 items-center justify-center gap-1 rounded-full bg-[#201714] px-4 text-sm font-medium text-white transition-colors hover:bg-[#120f0d]"
                  >
                    자세히 보기 <ChevronRight className="size-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsPlaying(true)}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-[#201714]/10 bg-white px-4 text-sm font-medium text-[#201714] transition-colors hover:bg-[#faf7f2]"
                  >
                    재생
                  </button>
                </div>
              </div>
            </div>

            <aside className="rounded-[24px] border border-[#2f241f]/8 bg-[linear-gradient(180deg,#fffdfa_0%,#f5efe6_100%)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d6e5a]">From The Shelf</p>
              <div className="mt-3 space-y-3">
                {recommendedItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      setIsPlaying(false);
                    }}
                    className="group flex w-full gap-3 rounded-[20px] border border-transparent bg-white/84 p-3 text-left transition-colors hover:border-[#2f241f]/10 hover:bg-white"
                  >
                    <div className="relative aspect-[4/3] w-[108px] shrink-0 overflow-hidden rounded-[16px] bg-[#e8ddd1]">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.title}
                          fill
                          sizes="108px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          unoptimized={item.thumbnailUrl.includes('ytimg.com')}
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-white/92 text-[#2f241f] shadow-sm">
                        <Play className="ml-0.5 size-3 fill-current" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8d6e5a]">
                        {noteText(index)}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[15px] font-semibold leading-6 text-[#231916]">
                        {item.title}
                      </p>
                      <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#6b5850]">
                        {summarize(item.description, 82)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        </article>
      </div>
    </section>
  );
}

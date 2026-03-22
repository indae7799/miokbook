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
  if (!cleaned) return '미옥서원의 인터뷰와 기록을 차분히 이어 보는 영상입니다.';
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

function noteText(index: number) {
  const labels = ['첫 장면', '곁에 둘 영상', '이어 보기'];
  return labels[index] ?? '추천 영상';
}

export default function YoutubeShowcaseSection({ items }: Props) {
  const playableItems = useMemo(() => items.filter((item) => item.youtubeId), [items]);
  const [activeId, setActiveId] = useState(playableItems[0]?.id ?? items[0]?.id ?? '');
  const [isPlaying, setIsPlaying] = useState(false);

  if (items.length === 0) return null;

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  const recommendedItems = items.filter((item) => item.id !== activeItem.id).slice(0, 3);

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#2f241f]/8 bg-[linear-gradient(180deg,#f8f5ef_0%,#fcfbf7_100%)] px-4 py-4 shadow-[0_18px_56px_-44px_rgba(36,24,21,0.24)] sm:px-5 sm:py-5 lg:px-6">
      <div className="flex items-center justify-between gap-4 border-b border-[#2f241f]/8 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a6053]">
            Miok Seowon Archive
          </p>
          <h2 className="mt-1 font-myeongjo text-[22px] font-semibold leading-tight text-[#201815] sm:text-[24px]">
            서가 곁에서 듣는 몇 장면
          </h2>
        </div>

        <Link
          href="/content"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-[#2f241f]/10 bg-white/90 px-3.5 text-sm font-medium text-[#3b2e28] transition-colors hover:bg-white"
        >
          전체보기 <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_360px] xl:grid-cols-[minmax(0,1.7fr)_380px]">
        <article className="min-w-0 overflow-hidden rounded-[24px] border border-black/5 bg-[#171311]">
          {isPlaying ? (
            <iframe
              key={activeItem.id}
              src={makeEmbedUrl(activeItem.youtubeId)}
              title={activeItem.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="aspect-[16/8.8] w-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              className="group relative block aspect-[16/8.8] w-full overflow-hidden text-left"
              aria-label={`${activeItem.title} 재생`}
            >
              {activeItem.thumbnailUrl ? (
                <Image
                  src={activeItem.thumbnailUrl}
                  alt={activeItem.title}
                  fill
                  sizes="(max-width: 1280px) 100vw, 920px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  unoptimized={activeItem.thumbnailUrl.includes('ytimg.com')}
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,8,0.08)_0%,rgba(10,8,8,0.42)_100%)]" />
              <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-white/92 px-4 py-2 text-[#2f241f] shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition-transform duration-300 group-hover:translate-y-[-1px] sm:bottom-5 sm:left-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#2f241f] text-white">
                  <Play className="ml-0.5 size-3.5 fill-current" />
                </span>
                <span className="text-sm font-medium">랜딩에서 바로 보기</span>
              </div>
            </button>
          )}
        </article>

        <aside className="flex min-w-0 flex-col rounded-[24px] border border-[#2f241f]/8 bg-white/88 p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d6e5a]">Selected Video</p>
            <h3 className="mt-2 font-myeongjo text-[20px] font-semibold leading-[1.35] text-[#201714] sm:text-[22px]">
              {activeItem.title}
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-[#62514a] sm:text-sm">
              {summarize(activeItem.description, 110)}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href={`/content/video/${activeItem.slug}`}
              className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-[#201714] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#120f0d]"
            >
              상세보기 <ChevronRight className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              className="inline-flex h-9 items-center justify-center rounded-full border border-[#201714]/10 bg-[#faf7f2] px-3.5 text-sm font-medium text-[#201714] transition-colors hover:bg-white"
            >
              재생
            </button>
          </div>

          <div className="mt-5 border-t border-[#2f241f]/8 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d6e5a]">Next Shelf</p>
            <div className="mt-3 space-y-2.5">
              {recommendedItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveId(item.id);
                    setIsPlaying(false);
                  }}
                  className="group flex w-full items-start gap-3 rounded-[18px] border border-transparent bg-[#f7f1e8] px-2.5 py-2.5 text-left transition-colors hover:border-[#2f241f]/10 hover:bg-[#fbf8f3]"
                >
                  <div className="relative aspect-[4/3] w-[88px] shrink-0 overflow-hidden rounded-[14px] bg-[#e8ddd1]">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        fill
                        sizes="88px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        unoptimized={item.thumbnailUrl.includes('ytimg.com')}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8d6e5a]">
                      {noteText(index)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[14px] font-medium leading-5 text-[#231916]">
                      {item.title}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-[#6b5850]">
                      {summarize(item.description, 56)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

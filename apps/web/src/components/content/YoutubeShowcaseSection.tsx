'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Play, Sparkles } from 'lucide-react';
import type { YoutubeContentListItem } from '@/lib/youtube-store';
import SectionHeading from '@/components/home/SectionHeading';

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

function summarize(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '책과 사람, 취향을 잇는 미옥서원의 영상 큐레이션입니다.';
  return cleaned.length > 90 ? `${cleaned.slice(0, 90)}...` : cleaned;
}

export default function YoutubeShowcaseSection({ items }: Props) {
  const playableItems = useMemo(() => items.filter((item) => item.youtubeId), [items]);
  const [activeId, setActiveId] = useState(playableItems[0]?.id ?? items[0]?.id ?? '');
  const [isPlaying, setIsPlaying] = useState(false);

  if (items.length === 0) return null;

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  const recommendedItems = items.filter((item) => item.id !== activeItem.id).slice(0, 3);

  return (
    <section className="space-y-5">
      <SectionHeading
        title="미옥서원 영상 큐레이션"
        subtitle="보고 싶은 이유가 먼저 보이도록, 지금 주목할 영상을 한 자리에서 큐레이션했습니다."
        rightSlot={
          <Link href="/content" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            전체보기 <ChevronRight className="size-4" />
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_360px] min-w-0">
        <article className="overflow-hidden rounded-2xl sm:rounded-[28px] border border-[#722f37]/10 bg-[linear-gradient(135deg,#fffaf7_0%,#fff_45%,#f8f2ec_100%)] shadow-[0_20px_60px_rgba(114,47,55,0.08)] min-w-0">
          <div className="flex items-center justify-between border-b border-[#722f37]/10 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#722f37]">
              <Sparkles className="size-4" />
              Editor&apos;s Pick
            </div>
            <Link
              href={`/content/video/${activeItem.slug}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#722f37] transition-colors hover:text-[#5d252d]"
            >
              상세 보기 <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-5 p-4 sm:p-6">
              <div className="overflow-hidden rounded-[22px] border border-black/5 bg-black shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
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
                        sizes="(max-width: 1024px) 100vw, 900px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        unoptimized={activeItem.thumbnailUrl.includes('ytimg.com')}
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.55)_100%)]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex items-center gap-3 rounded-full bg-white px-5 py-3 text-[#722f37] shadow-xl transition-transform group-hover:scale-[1.02]">
                        <span className="flex size-10 items-center justify-center rounded-full bg-[#722f37] text-white">
                          <Play className="ml-0.5 size-4 fill-current" />
                        </span>
                        <span className="text-sm font-semibold">랜딩에서 바로 재생</span>
                      </div>
                    </div>
                  </button>
                )}
              </div>

              <div className="space-y-3 px-1">
                <div className="inline-flex rounded-full border border-[#722f37]/15 bg-[#722f37]/6 px-3 py-1 text-[11px] font-semibold text-[#722f37]">
                  지금 눌러볼 만한 영상
                </div>
                <h3 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-[32px]">
                  {activeItem.title}
                </h3>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                  {summarize(activeItem.description)}
                </p>
              </div>
            </div>

            <div className="border-t border-[#722f37]/10 bg-[#f7efe9]/70 p-4 sm:p-5 lg:border-l lg:border-t-0">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a5560]">
                추천 영상 3선
              </p>
              <div className="space-y-3">
                {recommendedItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveId(item.id);
                      setIsPlaying(true);
                    }}
                    className="group flex w-full gap-3 rounded-[20px] border border-[#722f37]/10 bg-white/80 px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[#722f37]/30 hover:bg-white"
                  >
                    <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-2xl bg-[#eadfd6]">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.title}
                          fill
                          sizes="128px"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                          unoptimized={item.thumbnailUrl.includes('ytimg.com')}
                        />
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/18">
                        <div className="flex size-9 items-center justify-center rounded-full bg-white/92 text-[#722f37] shadow-sm">
                          <Play className="ml-0.5 size-4 fill-current" />
                        </div>
                      </div>
                      <div className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white">
                        0{index + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-6 text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {summarize(item.description)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

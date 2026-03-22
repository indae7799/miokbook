'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BookOpenText, ChevronRight, Play } from 'lucide-react';
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

function summarize(text?: string, max = 120) {
  const cleaned = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '미옥서원 인터뷰와 기록을 차분하게 이어 보는 영상입니다.';
  return cleaned.length > max ? `${cleaned.slice(0, max)}...` : cleaned;
}

function noteText(index: number) {
  const labels = ['첫 번째 추천', '다음 영상', '이어 보기'];
  return labels[index] ?? '추천 영상';
}

export default function YoutubeShowcaseSection({ items }: Props) {
  const playableItems = useMemo(() => items.filter((item) => item.youtubeId), [items]);
  const [activeId, setActiveId] = useState(playableItems[0]?.id ?? items[0]?.id ?? '');
  const [isPlaying, setIsPlaying] = useState(false);

  if (items.length === 0) return null;

  const activeItem = items.find((item) => item.id === activeId) ?? items[0];
  const relatedBooks = (activeItem.relatedBooks ?? []).slice(0, 3);
  const recommendedItems = items.filter((item) => item.id !== activeItem.id).slice(0, 3);

  return (
    <section className="rounded-[28px] border border-[#2f241f]/10 bg-[#fcfaf6] px-4 py-4 shadow-[0_20px_50px_-38px_rgba(36,24,21,0.28)] sm:px-5 sm:py-5 lg:px-6">
      <div className="flex items-center justify-between gap-4 border-b border-[#2f241f]/8 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7a6053]">
            Miok Seowon Archive
          </p>
          <h2 className="mt-1 font-myeongjo text-[22px] font-semibold leading-tight text-[#201815] sm:text-[24px]">
            서가 곁에서 듣는 문장들
          </h2>
        </div>

        <Link
          href="/content"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-[#2f241f]/10 bg-white px-3.5 text-sm font-medium text-[#3b2e28] transition-colors hover:bg-[#f8f2ea]"
        >
          전체보기 <ChevronRight className="size-4" />
        </Link>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.88fr)]">
        <article className="min-w-0 self-start overflow-hidden rounded-[24px] border border-black/8 bg-[#15110f] shadow-[0_26px_60px_-42px_rgba(0,0,0,0.72)]">
          {isPlaying ? (
            <iframe
              key={activeItem.id}
              src={makeEmbedUrl(activeItem.youtubeId)}
              title={activeItem.title}
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="aspect-[16/10] w-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsPlaying(true)}
              className="group relative block aspect-[16/10] w-full overflow-hidden text-left"
              aria-label={`${activeItem.title} 재생`}
            >
              {activeItem.thumbnailUrl ? (
                <Image
                  src={activeItem.thumbnailUrl}
                  alt={activeItem.title}
                  fill
                  sizes="(max-width: 1279px) 100vw, 760px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  unoptimized={activeItem.thumbnailUrl.includes('ytimg.com')}
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
                <span className="flex shrink-0 items-center gap-3 rounded-full bg-white/92 px-4 py-2 text-[#2f241f] shadow-[0_14px_30px_rgba(0,0,0,0.14)] transition-transform duration-300 group-hover:translate-y-[-1px]">
                  <span className="flex size-8 items-center justify-center rounded-full bg-[#2f241f] text-white">
                    <Play className="ml-0.5 size-3.5 fill-current" />
                  </span>
                  <span className="text-sm font-medium">바로 보기</span>
                </span>
              </div>

              {!activeItem.thumbnailUrl ? (
                <div className="absolute left-5 top-5 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium text-white/82 backdrop-blur-sm">
                  썸네일 없음
                </div>
              ) : null}
            </button>
          )}
        </article>

        <aside className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-[24px] border border-[#2f241f]/8 bg-[rgba(255,255,255,0.88)] p-5 shadow-[0_16px_36px_-30px_rgba(36,24,21,0.35)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d6e5a]">Introduction</p>
            <h3 className="mt-2 font-myeongjo text-[21px] font-semibold leading-[1.38] text-[#201714] sm:text-[22px]">
              {activeItem.title}
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-[#62514a] sm:text-sm">
              {summarize(activeItem.description, 150)}
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href={`/content/video/${activeItem.slug}`}
                className="inline-flex h-10 items-center justify-center gap-1 rounded-full bg-[#201714] px-4 text-sm font-medium text-white transition-colors hover:bg-[#120f0d]"
              >
                자세히 보기 <ChevronRight className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-[#201714]/10 bg-[#f6efe8] px-4 text-sm font-medium text-[#201714] transition-colors hover:bg-white"
              >
                재생
              </button>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#2f241f]/8 bg-[#f7f1e8] p-5 shadow-[0_16px_36px_-30px_rgba(36,24,21,0.28)]">
            <div className="flex items-center gap-2 text-[#201714]">
              <BookOpenText className="size-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d6e5a]">Related Books</p>
            </div>

            {relatedBooks.length > 0 ? (
              <div className="mt-4 space-y-3">
                {relatedBooks.map((book) => (
                  <Link
                    key={book.isbn}
                    href={book.slug ? `/books/${book.slug}` : (book.link ?? '#')}
                    className="group flex items-start gap-3 rounded-[18px] bg-white/72 p-3 transition-colors hover:bg-white"
                  >
                    <div className="relative h-[86px] w-[62px] shrink-0 overflow-hidden rounded-[12px] bg-[#e8ddd1] shadow-[0_10px_24px_-18px_rgba(36,24,21,0.55)]">
                      {book.cover ? (
                        <Image
                          src={book.cover}
                          alt={book.title}
                          fill
                          sizes="62px"
                          className="object-cover"
                          unoptimized={book.source === 'aladin'}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-medium text-[#7f6759]">
                          표지 없음
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[14px] font-semibold leading-5 text-[#231916] group-hover:underline">
                        {book.title}
                      </p>
                      <p className="mt-1 text-[12px] text-[#6b5850]">{book.author}</p>
                      <p className="text-[12px] text-[#8d7567]">{book.publisher}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] bg-white/60 px-4 py-5 text-sm leading-6 text-[#6b5850]">
                연결된 관련 도서가 아직 없습니다.
              </div>
            )}
          </section>

          <section className="rounded-[24px] border border-[#2f241f]/8 bg-white p-5 shadow-[0_16px_36px_-30px_rgba(36,24,21,0.3)] lg:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d6e5a]">More Videos</p>
              <span className="text-[11px] text-[#8d7567]">추천 3개</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {recommendedItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveId(item.id);
                    setIsPlaying(false);
                  }}
                  className="group flex w-full items-start gap-3 rounded-[18px] border border-transparent bg-[#faf6f1] p-3 text-left transition-all hover:border-[#2f241f]/10 hover:bg-[#fffdf9]"
                >
                  <div className="relative aspect-[16/10] w-[116px] shrink-0 overflow-hidden rounded-[14px] bg-[#e8ddd1] shadow-[0_10px_24px_-18px_rgba(36,24,21,0.5)]">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        fill
                        sizes="116px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        unoptimized={item.thumbnailUrl.includes('ytimg.com')}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,#ecdfd1_0%,#d9c7b4_100%)]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_35%,rgba(0,0,0,0.18)_100%)]" />
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
          </section>
        </aside>
      </div>
    </section>
  );
}

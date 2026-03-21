'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ExternalLink } from 'lucide-react';
import {
  type BookMeta,
  type YoutubeContent,
  getYoutubeThumbnail,
  isLikelyDirectVideoUrl,
  isSafeHttpUrl,
} from '@/types/youtube-content';

interface Props {
  content: YoutubeContent;
  books: BookMeta[];
}

const YT_ORIGIN = 'https://www.youtube.com';

function makeEmbedUrl(videoId: string) {
  const params = new URLSearchParams({
    enablejsapi: '1',
    rel: '0',
    modestbranding: '1',
  });
  return `${YT_ORIGIN}/embed/${videoId}?${params}`;
}

function stopVideo(iframe: HTMLIFrameElement | null) {
  if (!iframe) return;
  iframe.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func: 'stopVideo', args: '' }),
    YT_ORIGIN
  );
}

function ExternalPlaybackBlock({ content, url }: { content: YoutubeContent; url: string }) {
  const direct = isLikelyDirectVideoUrl(url);
  const poster = content.customThumbnailUrl?.trim();

  if (direct) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full"
          poster={poster || undefined}
        >
          이 브라우저에서는 영상을 재생할 수 없습니다.
        </video>
      </div>
    );
  }

  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-5 bg-gradient-to-b from-muted/60 to-muted/30 px-6 py-10 text-center sm:min-h-[320px]">
      {poster ? (
        <div className="relative aspect-video w-full max-w-lg overflow-hidden rounded-xl border border-border shadow-md">
          <Image
            src={poster}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 512px"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ExternalLink className="size-7" aria-hidden />
        </div>
      )}
      <div className="max-w-lg space-y-2">
        <p className="text-base font-medium text-foreground">외부 링크로 재생됩니다</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          웹하드·클라우드 <strong className="text-foreground">페이지</strong>는 보안상 여기에 끼울 수 없어요.
          아래 버튼으로 해당 사이트에서 이어서 시청해 주세요.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">.mp4</span> 같은 <strong>직접 파일 주소</strong>면 이 화면에서 바로 재생돼요.
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
      >
        <ExternalLink className="size-4" aria-hidden />
        영상 열기
      </a>
    </div>
  );
}

export default function YoutubeContentViewer({ content, books }: Props) {
  const ytId = (content.mainYoutubeId ?? '').trim();
  const extRaw = (content.externalPlaybackUrl ?? '').trim();
  const extOk = extRaw.length > 0 && isSafeHttpUrl(extRaw);
  const useYoutube = Boolean(ytId);

  const [activeId, setActiveId] = useState(ytId);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const allIds = useMemo(
    () => [...new Set([ytId, ...(content.relatedYoutubeIds ?? [])])].filter(Boolean),
    [ytId, content.relatedYoutubeIds]
  );

  function handleThumbnailClick(id: string) {
    if (id === activeId) return;
    stopVideo(iframeRef.current);
    setActiveId(id);
  }

  const [showAllBooks, setShowAllBooks] = useState(false);
  const mainBook = books[0] ?? null;
  const extraBooks = books.slice(1);

  if (!useYoutube && !extOk) {
    return (
      <div className="min-h-[40vh] px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">재생할 영상 정보가 없습니다.</p>
        <Link href="/content" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          콘텐츠 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/35 via-background to-background">
      <div className="border-b border-border/80 bg-card/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm" aria-label="위치">
            <Link href="/" className="transition-colors hover:text-foreground">
              홈
            </Link>
            <ChevronRight className="size-3.5 shrink-0 opacity-40" aria-hidden />
            <Link href="/content" className="transition-colors hover:text-foreground">
              콘텐츠
            </Link>
            <ChevronRight className="size-3.5 shrink-0 opacity-40" aria-hidden />
            <span className="line-clamp-1 font-medium text-foreground">{content.title}</span>
          </nav>
          <Link
            href="/content"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            콘텐츠 목록으로 돌아가기
          </Link>
        </div>
      </div>

      <article className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {content.title}
          </h1>
        </header>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="min-w-0 flex-1 space-y-8">
            <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-xl ring-1 ring-black/10">
              {useYoutube ? (
                <iframe
                  ref={iframeRef}
                  key={activeId}
                  src={makeEmbedUrl(activeId)}
                  title={content.title}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="aspect-video w-full"
                />
              ) : (
                <ExternalPlaybackBlock content={content} url={extRaw} />
              )}
            </div>

            {content.description ? (
              <div className="rounded-2xl border border-border/80 bg-card/50 px-5 py-4 shadow-sm">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {content.description}
                </p>
              </div>
            ) : null}

            {useYoutube && allIds.length > 1 ? (
              <section className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">이어서 보기</h2>
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin] snap-x snap-mandatory sm:gap-4">
                  {allIds.map((id) => {
                    const active = id === activeId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleThumbnailClick(id)}
                        className={`relative flex-none snap-start overflow-hidden rounded-xl border-2 transition-all ${
                          active
                            ? 'border-primary shadow-md ring-2 ring-primary/20'
                            : 'border-transparent opacity-75 hover:opacity-100 hover:ring-1 hover:ring-border'
                        }`}
                        style={{ width: 168 }}
                      >
                        <span className="relative block aspect-video w-[168px] bg-muted">
                          <Image
                            src={getYoutubeThumbnail(id, 'mq')}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="168px"
                            unoptimized
                          />
                        </span>
                        {active ? (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              재생 중
                            </span>
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>

          {mainBook ? (
            <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72 lg:self-start">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">관련 도서</h2>
              <div className="rounded-2xl border border-border bg-card p-1 shadow-sm">
                <Link
                  href={mainBook.slug ? `/books/${mainBook.slug}` : (mainBook.link ?? '#')}
                  className="group block rounded-xl p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="flex gap-3">
                    <Image
                      src={mainBook.cover}
                      alt={mainBook.title}
                      width={72}
                      height={102}
                      className="shrink-0 rounded-lg object-cover shadow-sm"
                      unoptimized={mainBook.source === 'aladin'}
                    />
                    <div className="min-w-0 text-sm">
                      <p className="line-clamp-2 font-semibold leading-snug group-hover:underline">{mainBook.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{mainBook.author}</p>
                      <p className="text-xs text-muted-foreground/80">{mainBook.publisher}</p>
                    </div>
                  </div>
                </Link>
                {extraBooks.length > 0 ? (
                  <div className="border-t border-border px-1 pb-1 pt-2">
                    {showAllBooks
                      ? extraBooks.map((book) => (
                          <Link
                            key={book.isbn}
                            href={book.slug ? `/books/${book.slug}` : (book.link ?? '#')}
                            className="group flex gap-2 rounded-lg p-2 transition-colors hover:bg-muted/50"
                          >
                            <Image
                              src={book.cover}
                              alt={book.title}
                              width={40}
                              height={56}
                              className="shrink-0 rounded object-cover"
                              unoptimized={book.source === 'aladin'}
                            />
                            <div className="min-w-0 text-xs">
                              <p className="line-clamp-2 font-medium leading-snug group-hover:underline">{book.title}</p>
                              <p className="mt-0.5 text-muted-foreground">{book.author}</p>
                            </div>
                          </Link>
                        ))
                      : null}
                    <button
                      type="button"
                      onClick={() => setShowAllBooks((v) => !v)}
                      className="mt-1 w-full rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      {showAllBooks ? '접기' : `도서 ${extraBooks.length}권 더 보기`}
                    </button>
                  </div>
                ) : null}
              </div>
            </aside>
          ) : null}
        </div>
      </article>
    </div>
  );
}

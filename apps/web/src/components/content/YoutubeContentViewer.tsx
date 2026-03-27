'use client';

import { useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ExternalLink } from 'lucide-react';
import {
  type YoutubeContent,
  getYoutubeThumbnail,
  isLikelyDirectVideoUrl,
  isSafeHttpUrl,
} from '@/types/youtube-content';
import { youtubeEmbedUrl } from '@/lib/youtube-embed-url';
import { YoutubePlayTapArea } from '@/components/content/youtube-style-play';

interface Props {
  content: YoutubeContent;
}

const YT_ORIGIN = 'https://www.youtube.com';

function makeEmbedUrl(videoId: string, autoplay: boolean) {
  return youtubeEmbedUrl(videoId, { enableJsApi: true, autoplay, mute: true });
}

function stopVideo(iframe: HTMLIFrameElement | null) {
  if (!iframe) return;
  iframe.contentWindow?.postMessage(
    JSON.stringify({ event: 'command', func: 'stopVideo', args: '' }),
    YT_ORIGIN,
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
          브라우저에서 이 영상을 재생할 수 없습니다.
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
        <p className="text-base font-medium text-foreground">외부 링크로 재생됩니다.</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          보안 정책상 이 페이지 안에서 바로 재생할 수 없는 영상입니다. 아래 버튼으로 원본 사이트에서
          이어서 시청해 주세요.
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">.mp4</span> 같은 직접 파일 주소는 이 화면에서 바로 재생됩니다.
        </p>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95"
      >
        <ExternalLink className="size-4" aria-hidden />
        영상 보기
      </a>
    </div>
  );
}

function VideoStage({
  content,
  useYoutube,
  ytStarted,
  activeId,
  extRaw,
  iframeRef,
  posterSrc,
  posterCandidates,
  setPosterIndex,
  setYtStarted,
}: {
  content: YoutubeContent;
  useYoutube: boolean;
  ytStarted: boolean;
  activeId: string;
  extRaw: string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  posterSrc: string;
  posterCandidates: string[];
  setPosterIndex: React.Dispatch<React.SetStateAction<number>>;
  setYtStarted: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  if (!useYoutube) {
    return <ExternalPlaybackBlock content={content} url={extRaw} />;
  }

  if (ytStarted) {
    return (
      <iframe
        ref={iframeRef}
        key={`${activeId}-play`}
        src={makeEmbedUrl(activeId, true)}
        title={content.title}
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="aspect-video w-full"
      />
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      {posterSrc ? (
        <Image
          src={posterSrc}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 900px"
          className="object-cover"
          unoptimized={posterSrc.includes('ytimg.com')}
          onError={() => setPosterIndex((i) => (i < posterCandidates.length - 1 ? i + 1 : i))}
          priority
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-b from-muted/40 to-black" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.65)_0%,rgba(0,0,0,0.1)_45%,rgba(0,0,0,0.35)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pb-16 pt-4 sm:px-6 sm:pt-5">
        <p className="line-clamp-2 text-base font-semibold leading-snug text-white drop-shadow-md sm:text-lg">
          {content.title}
        </p>
      </div>
      <YoutubePlayTapArea label={`${content.title} 재생`} onActivate={() => setYtStarted(true)} />
    </div>
  );
}

export default function YoutubeContentViewer({ content }: Props) {
  const ytId = (content.mainYoutubeId ?? '').trim();
  const extRaw = (content.externalPlaybackUrl ?? '').trim();
  const extOk = extRaw.length > 0 && isSafeHttpUrl(extRaw);
  const relatedPoster = (content.relatedImageUrl ?? '').trim();
  const useYoutube = Boolean(ytId);

  const [activeId, setActiveId] = useState(ytId);
  const [ytStarted, setYtStarted] = useState(false);
  const [posterIndex, setPosterIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const allIds = useMemo(
    () => [...new Set([ytId, ...(content.relatedYoutubeIds ?? [])])].filter(Boolean),
    [ytId, content.relatedYoutubeIds],
  );

  const posterCandidates = useMemo(() => {
    const custom = (content.customThumbnailUrl ?? '').trim();
    const list: string[] = [];
    if (activeId === ytId && custom) list.push(custom);
    list.push(
      getYoutubeThumbnail(activeId, 'maxres'),
      getYoutubeThumbnail(activeId, 'sd'),
      getYoutubeThumbnail(activeId, 'hq'),
    );
    return Array.from(new Set(list.filter(Boolean)));
  }, [activeId, ytId, content.customThumbnailUrl]);

  const posterSrc = posterCandidates[posterIndex] ?? '';

  function handleThumbnailClick(id: string) {
    if (id === activeId) return;
    stopVideo(iframeRef.current);
    setActiveId(id);
    setYtStarted(false);
    setPosterIndex(0);
  }

  if (!useYoutube && !extOk) {
    return (
      <div className="min-h-[40vh] px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">재생 가능한 영상 정보가 없습니다.</p>
        <Link href="/content" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          콘텐츠 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/35 via-background to-background">
      <div className="border-b border-border/80 bg-card/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-[1160px] px-4 py-3 sm:px-6">
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

      <article className="mx-auto max-w-[1160px] px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-8 max-w-3xl">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">
            {content.title}
          </h1>
        </header>

        <div className="space-y-8">
          <section className={`grid items-stretch gap-5 ${relatedPoster ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
            <div className="overflow-hidden rounded-2xl border border-border bg-black shadow-xl ring-1 ring-black/10">
              <VideoStage
                content={content}
                useYoutube={useYoutube}
                ytStarted={ytStarted}
                activeId={activeId}
                extRaw={extRaw}
                iframeRef={iframeRef}
                posterSrc={posterSrc}
                posterCandidates={posterCandidates}
                setPosterIndex={setPosterIndex}
                setYtStarted={setYtStarted}
              />
            </div>

            {relatedPoster ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="relative h-full min-h-[240px] bg-[#f7f3ee] lg:min-h-full">
                  <Image
                    src={relatedPoster}
                    alt={`${content.title} 포스터`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 360px"
                    className="object-contain p-4"
                    unoptimized
                  />
                </div>
              </div>
            ) : null}
          </section>

          {content.description ? (
            <div className="rounded-2xl border border-border/80 bg-card/50 px-5 py-4 shadow-sm">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {content.description}
              </p>
            </div>
          ) : null}

          {useYoutube && allIds.length > 1 ? (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">이어서 보기</h2>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin] sm:gap-4">
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
      </article>
    </div>
  );
}

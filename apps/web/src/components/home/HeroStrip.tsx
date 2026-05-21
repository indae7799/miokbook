'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { normalizeCmsLinkUrl } from '@/lib/link-url';

interface HeroStripProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
}

export default function HeroStrip({
  title,
  subtitle,
  imageUrl,
  linkUrl = '/',
}: HeroStripProps) {
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerCurrentRef = useRef({ x: 0, y: 0 });
  const imageLayerRef = useRef<HTMLDivElement | null>(null);
  const glowLayerRef = useRef<HTMLDivElement | null>(null);
  const contentLayerRef = useRef<HTMLDivElement | null>(null);
  const hasImage = Boolean(imageUrl?.trim());
  const normalizedLinkUrl = normalizeCmsLinkUrl(linkUrl, '/');

  useEffect(() => {
    let frameId = 0;

    const animate = () => {
      const current = pointerCurrentRef.current;
      const target = pointerTargetRef.current;

      current.x += (target.x - current.x) * 0.12;
      current.y += (target.y - current.y) * 0.12;

      if (Math.abs(current.x) < 0.01 && Math.abs(target.x) < 0.01) current.x = 0;
      if (Math.abs(current.y) < 0.01 && Math.abs(target.y) < 0.01) current.y = 0;

      if (imageLayerRef.current) {
        imageLayerRef.current.style.transform = `translate3d(${current.x}px, ${current.y * 1.35}px, 0)`;
      }
      if (glowLayerRef.current) {
        glowLayerRef.current.style.transform = `translate3d(${current.x * -0.35}px, ${current.y * -0.52}px, 0)`;
      }
      if (contentLayerRef.current) {
        contentLayerRef.current.style.transform = `translate3d(${current.x * 0.45}px, ${current.y * 0.3}px, 0)`;
      }

      frameId = window.requestAnimationFrame(animate);
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  if (!hasImage) {
    return (
      <section className="relative flex w-full min-h-[200px] items-center justify-center overflow-hidden border-b border-border bg-[#f8f6f2] px-4 py-12 sm:min-h-[280px]">
        <div className="mx-auto max-w-[1400px] text-center">
          <p className="text-lg font-medium text-muted-foreground">서점 대표 이미지</p>
          <p className="mt-1 text-sm text-muted-foreground">
            관리자 배너 설정에 대표 이미지를 등록하면 이 영역에 노출됩니다.
          </p>
          <Link href="/admin/marketing" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            서점 이미지 설정하기
          </Link>
        </div>
      </section>
    );
  }

  const mainSrc = imageUrl!.trim();

  return (
    <section
      className="relative isolate h-[240px] w-full overflow-hidden border-b border-border bg-[#f8f6f2] sm:h-[340px] md:h-[560px]"
      onPointerMove={(event) => {
        if (window.innerWidth < 768) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 18;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 16;
        pointerTargetRef.current = { x, y };
      }}
      onPointerLeave={() => {
        pointerTargetRef.current = { x: 0, y: 0 };
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[#e8e6e2]" aria-hidden>
        <div className="hero-cinematic-pan absolute inset-[-4%] motion-reduce:inset-0 motion-reduce:transform-none motion-reduce:animate-none">
          <div ref={imageLayerRef} className="absolute inset-0 will-change-transform">
            <Image
              src={mainSrc}
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center scale-[1.06] motion-reduce:scale-100"
              priority
            />
          </div>
        </div>
      </div>
      <div className="absolute inset-0 z-[1] bg-black/18" />
      {(title || subtitle) ? (
        <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/82 via-black/36 to-transparent" />
      ) : null}
      <div
        ref={glowLayerRef}
        className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(circle_at_78%_22%,rgba(255,214,170,0.32),transparent_18%),linear-gradient(to_top,rgba(0,0,0,0.52),transparent_42%),linear-gradient(to_right,rgba(17,12,9,0.2),transparent_60%)]"
      />

      <Link
        href={normalizedLinkUrl}
        className="relative z-10 flex h-full w-full flex-col justify-end px-5 pb-6 transition-opacity hover:opacity-95 sm:px-8 sm:pb-8 md:px-16 md:pb-14"
      >
        <div ref={contentLayerRef} className="mx-auto flex w-full max-w-[1600px] flex-col will-change-transform">
          <div className="max-w-4xl space-y-3 md:space-y-6">
            {title ? (
              <h2 className="text-[1.7rem] font-bold tracking-tight text-white drop-shadow-lg sm:text-4xl md:text-[4.8rem]">
                {title}
              </h2>
            ) : null}
            <div className="flex flex-col gap-4 md:gap-6">
              {subtitle ? (
                <p className="max-w-xl text-[11px] font-light uppercase tracking-[0.18em] text-white/90 drop-shadow-md sm:text-sm sm:tracking-[0.2em] md:text-xl md:tracking-[0.22em]">
                  {subtitle}
                </p>
              ) : null}
              {(title || subtitle) ? <div className="mt-2 h-px w-16 bg-white/50 md:w-28" /> : null}
            </div>
          </div>
        </div>
      </Link>
      <style jsx>{`
        .hero-cinematic-pan {
          animation: hero-cinematic-pan 18s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite alternate;
          will-change: transform;
        }

        @keyframes hero-cinematic-pan {
          0% {
            transform: translate3d(-2.4%, 1.1%, 0) scale(1.04);
          }
          100% {
            transform: translate3d(2.4%, -1.6%, 0) scale(1.08);
          }
        }

        @media (max-width: 767px) {
          .hero-cinematic-pan {
            animation-duration: 22s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-cinematic-pan {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}

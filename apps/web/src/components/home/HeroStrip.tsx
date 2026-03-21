'use client';

import Link from 'next/link';
import Image from 'next/image';

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
  linkUrl = "/"
}: HeroStripProps) {
  return (
    <section className="relative w-full h-[320px] md:h-[560px] overflow-hidden bg-[#f8f6f2] border-b border-border">
      {imageUrl && (
        <>
          <Image
            src={imageUrl}
            alt={title || "미옥서원"}
            fill
            priority
            className="object-cover object-[center_65%]"
            unoptimized
          />
          {/* 어느 사진이 들어와도 흰색 텍스트가 잘 보이도록 기본 검정 필터 강화 (40%) */}
          <div className="absolute inset-0 bg-black/40 z-[1]" />
          {/* 가독성을 더 높이기 위한 그라데이션 오버레이 보강 */}
          {(title || subtitle) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-[2]" />
          )}
        </>
      )}
      
      <Link 
        href={linkUrl} 
        className="relative z-10 flex flex-col items-center justify-center h-full px-8 md:px-16 hover:opacity-95 transition-opacity"
      >
        <div className="w-full max-w-[1400px] mx-auto flex flex-col items-center text-center">
          <div className="max-w-4xl space-y-3 md:space-y-6">
            {title && (
              <h2 className={`text-3xl md:text-7xl font-bold tracking-tight ${imageUrl ? 'text-white' : 'text-primary'} drop-shadow-lg`}>
                {title}
              </h2>
            )}
            <div className="flex flex-col items-center gap-4 md:gap-6">
              {subtitle && (
                <p className={`text-base md:text-2xl font-light tracking-[0.2em] uppercase ${imageUrl ? 'text-white/90' : 'text-muted-foreground'} drop-shadow-md`}>
                  {subtitle}
                </p>
              )}
              {/* 기하학적 연결 라인: 중앙 정렬로 변경하여 안정감 부여 */}
              <div className="w-12 md:w-24 h-[1px] bg-white/50 mt-2" />
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import SmartLink from '@/components/common/SmartLink';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

/** 메인 캐러셀 배너 이미지 클릭 시 이동 (전체보기와 동일) */
const HERO_CAROUSEL_DEST = '/events';

export interface HeroBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
}

export interface StoreHeroImage {
  imageUrl: string;
  linkUrl: string;
}

export interface HeroCarouselProps {
  banners: HeroBanner[];
  /** 서점 대문 이미지. 있으면 캐러셀 첫 슬라이드로 노출 */
  storeHero?: StoreHeroImage | null;
  /** 대문 슬라이드 위 카피 (HeroStrip과 동일 톤) */
  storeHeroTitle?: string;
  storeHeroSubtitle?: string;
}

/** 배너가 없을 때 홈 상단에 보이는 플레이스홀더 (MVP 첫 설정 유도) */
function HeroPlaceholder() {
  return (
    <section className="w-full h-full rounded-lg overflow-hidden bg-muted border border-border">
      <div className="relative h-full min-h-[120px] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-lg font-medium text-muted-foreground">메인 배너 영역</p>
          <p className="text-sm text-muted-foreground mt-1">
            관리자 페이지에서 배너를 추가하면 여기에 노출됩니다.
          </p>
          <Link
            href="/admin/marketing"
            className="inline-block mt-3 text-sm font-medium text-primary hover:underline"
          >
            배너 추가하기 (관리자 → 배너/팝업)
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HeroCarousel({
  banners,
  storeHero,
  storeHeroTitle,
  storeHeroSubtitle,
}: HeroCarouselProps) {
  const [mounted, setMounted] = useState(false);
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const slides = useMemo(() => {
    const fromBanners = (banners ?? []).filter((b) => b.imageUrl?.trim());
    const storeUrl = storeHero?.imageUrl?.trim();
    if (!storeUrl) return fromBanners;

    const firstBannerUrl = fromBanners[0]?.imageUrl?.trim();
    const rest = firstBannerUrl === storeUrl ? fromBanners.slice(1) : fromBanners;
    const storeSlide: HeroBanner = {
      id: '__store_hero__',
      imageUrl: storeUrl,
      linkUrl: (storeHero?.linkUrl ?? '/').trim() || '/',
    };
    return [storeSlide, ...rest];
  }, [banners, storeHero]);

  if (slides.length === 0) {
    return (
      <section className="w-full lg:flex lg:h-full lg:min-h-0 lg:flex-col">
        <HeroPlaceholder />
      </section>
    );
  }

  // Hydration mismatch 방지: 마운트 전엔 첫 슬라이드 이미지를 정적으로 노출 (스켈레톤 제거)
  if (!mounted) {
    const firstSlide = slides[0];
    return (
      <section className="w-full lg:flex lg:h-full lg:min-h-0 lg:flex-col">
        <SmartLink
          href={HERO_CAROUSEL_DEST}
          className="relative block w-full min-h-[220px] sm:min-h-[300px] aspect-[10/4] lg:aspect-auto lg:h-full lg:min-h-0 lg:flex-1 overflow-hidden rounded-none border border-border bg-muted shadow-[0_6px_28px_rgba(0,0,0,0.14)] lg:rounded-lg"
        >
          {firstSlide && (
            <Image
              src={firstSlide.imageUrl}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 70vw"
              className="object-cover"
              priority
              quality={85}
            />
          )}
        </SmartLink>
      </section>
    );
  }

  const totalSlides = slides.length;
  const currentLabel = String(activeIndex + 1).padStart(2, '0');
  const totalLabel = String(totalSlides).padStart(2, '0');

  const handleTogglePause = () => {
    if (!swiper?.autoplay) return;
    if (isPaused) {
      swiper.autoplay.start();
      setIsPaused(false);
    } else {
      swiper.autoplay.stop();
      setIsPaused(true);
    }
  };

  const handlePrev = () => swiper?.slidePrev();
  const handleNext = () => swiper?.slideNext();

  return (
    <section className="w-full lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      {/*
        모바일·태블릿: 가로 기준 10:4 비율.
        lg+: 우측 북콘서트 카드(표지 비율 고정)와 같은 행 높이에 맞춰 캐러셀만 세로로 늘림 — 표지는 줄이지 않음.
        컨트롤은 배너 영역 하단(absolute) — 플로우에 넣지 않아 배너 높이를 줄이지 않음.
      */}
      <div className="relative w-full min-h-[220px] sm:min-h-[300px] aspect-[10/4] lg:aspect-auto lg:h-full lg:min-h-0 lg:flex-1 bg-muted rounded-none lg:rounded-lg overflow-hidden border border-border shadow-[0_6px_28px_rgba(0,0,0,0.14)]">
        <div className="absolute inset-0 h-full w-full">
          <Swiper
              modules={[Autoplay, EffectFade]}
              effect="fade"
              fadeEffect={{ crossFade: true }}
              spaceBetween={0}
              slidesPerView={1}
              autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
              onSwiper={setSwiper}
              onSlideChange={(s) => setActiveIndex(s.realIndex)}
              className="h-full w-full"
              style={{ width: '100%', height: '100%' }}
            >
              {slides.map((b, index) => (
                <SwiperSlide key={b.id} className="h-full w-full">
                  <SmartLink href={HERO_CAROUSEL_DEST} className="relative block h-full w-full">
                    <Image
                      src={b.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 70vw"
                      className="object-cover"
                      priority={index <= 1}
                      quality={85}
                    />
                    {b.id === '__store_hero__' && (storeHeroTitle || storeHeroSubtitle) ? (
                      <>
                        <div className="pointer-events-none absolute inset-0 z-[1] bg-black/40" />
                        <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/60 via-transparent to-black/20" />
                        <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center px-4 text-center sm:px-8">
                          {storeHeroTitle ? (
                            <h2 className="max-w-4xl text-xl font-bold tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-5xl lg:text-6xl">
                              {storeHeroTitle}
                            </h2>
                          ) : null}
                          {storeHeroSubtitle ? (
                            <p className="mt-3 max-w-2xl text-sm font-light uppercase tracking-[0.15em] text-white/90 drop-shadow-md sm:mt-4 sm:text-base md:text-xl md:tracking-[0.2em]">
                              {storeHeroSubtitle}
                            </p>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </SmartLink>
                </SwiperSlide>
              ))}
            </Swiper>
        </div>

        <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/35 p-1 text-white backdrop-blur-sm">
          <button
            type="button"
            aria-label={isPaused ? '캐러셀 재생' : '캐러셀 일시정지'}
            onClick={handleTogglePause}
            className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            aria-label="이전 배너"
            onClick={handlePrev}
            disabled={totalSlides <= 1}
            className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="pointer-events-auto min-w-[62px] text-center text-xs font-semibold tabular-nums tracking-wide">
            {currentLabel} - {totalLabel}
          </span>

          <button
            type="button"
            aria-label="다음 배너"
            onClick={handleNext}
            disabled={totalSlides <= 1}
            className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <SmartLink
            href={HERO_CAROUSEL_DEST}
            className="pointer-events-auto inline-flex h-7 items-center rounded-full bg-white/20 px-2.5 text-xs font-semibold transition-colors hover:bg-white/30"
          >
            전체보기
          </SmartLink>
        </div>
      </div>
    </section>
  );
}

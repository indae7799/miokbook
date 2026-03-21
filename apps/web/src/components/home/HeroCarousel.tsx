'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { EffectFade, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-fade';
import SmartLink from '@/components/common/SmartLink';
import { cmsPreferNativeImg } from '@/lib/cms-image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

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

export default function HeroCarousel({ banners }: HeroCarouselProps) {
  const [mounted, setMounted] = useState(false);
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const slides = (banners ?? []).filter((b) => b.imageUrl?.trim());

  if (slides.length === 0) return <HeroPlaceholder />;

  // Hydration mismatch 방지: 브라우저에서만 Swiper 렌더링
  if (!mounted) {
    return (
      <section className="w-full h-full">
        <div className="relative w-full h-full min-h-[120px] bg-muted rounded-none lg:rounded-lg overflow-hidden animate-pulse" />
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
    <section className="w-full h-full">
      {/* 부모(HomeTopCmsClient)의 flex-1 h-full을 채움 */}
      <div className="relative w-full h-full min-h-[120px] bg-muted rounded-none lg:rounded-lg overflow-hidden border border-border shadow-[0_6px_28px_rgba(0,0,0,0.14)]">
        <div className="absolute inset-0 w-full h-full">
          <Swiper
            modules={[Autoplay, EffectFade]}
            effect="fade"
            fadeEffect={{ crossFade: true }}
            spaceBetween={0}
            slidesPerView={1}
            autoplay={{ delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true }}
            onSwiper={setSwiper}
            onSlideChange={(s) => setActiveIndex(s.realIndex)}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          >
            {slides.map((b, index) => (
              <SwiperSlide key={b.id} className="w-full h-full">
                <SmartLink href={b.linkUrl} className="block relative w-full h-full">
                  {cmsPreferNativeImg(b.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- /uploads 는 next/image 파이프 400 회피
                    <img
                      src={b.imageUrl}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <Image
                      src={b.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 70vw"
                      className="object-cover"
                      priority={index === 0}
                    />
                  )}
                </SmartLink>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/35 p-1 text-white backdrop-blur-sm">
          <button
            type="button"
            aria-label={isPaused ? '캐러셀 재생' : '캐러셀 일시정지'}
            onClick={handleTogglePause}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            aria-label="이전 배너"
            onClick={handlePrev}
            disabled={totalSlides <= 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <span className="min-w-[62px] text-center text-xs font-semibold tracking-wide tabular-nums">
            {currentLabel} - {totalLabel}
          </span>

          <button
            type="button"
            aria-label="다음 배너"
            onClick={handleNext}
            disabled={totalSlides <= 1}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <SmartLink
            href="/books"
            className="inline-flex h-7 items-center rounded-full bg-white/20 px-2.5 text-xs font-semibold hover:bg-white/30 transition-colors"
          >
            전체보기
          </SmartLink>
        </div>
      </div>
    </section>
  );
}

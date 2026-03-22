'use client';

import Link from 'next/link';
import HeroStrip from '@/components/home/HeroStrip';
import QuickNav from '@/components/home/QuickNav';
import HeroCarousel from '@/components/home/HeroCarousel';
import ConcertVerticalCard, { type ConcertVerticalCardItem } from '@/components/concerts/ConcertVerticalCard';

interface HeroBanner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
}

interface StoreHero {
  imageUrl: string;
  linkUrl: string;
}

interface HomeTopCmsClientProps {
  demoConcert: ConcertVerticalCardItem | null;
  ssrStoreHero?: StoreHero | null;
  ssrHeroBanners?: HeroBanner[];
  ssrMeetingImage?: { imageUrl: string } | null;
}

export default function HomeTopCmsClient({
  demoConcert,
  ssrStoreHero = null,
  ssrHeroBanners = [],
  ssrMeetingImage = null,
}: HomeTopCmsClientProps) {
  const storeHero = ssrStoreHero;
  const heroBanners = (ssrHeroBanners ?? []).filter(
    (banner) => (banner.position ?? 'main_hero') === 'main_hero',
  );

  const doorUrl = storeHero?.imageUrl?.trim();
  const heroBannersForCarousel =
    doorUrl && heroBanners[0]?.imageUrl?.trim() === doorUrl
      ? heroBanners.slice(1)
      : heroBanners;

  const concertCard = demoConcert
    ? { ...demoConcert, imageUrl: ssrMeetingImage?.imageUrl || demoConcert.imageUrl }
    : null;

  return (
    <section className="w-full">
      <div className="flex flex-col gap-6">
        {/* CMS 「서점 이미지 (탭 위 대문)」: 헤더 바로 아래 · 탭(QuickNav) 위 전폭. 캐러셀과는 별도 */}
        <HeroStrip
          title="함께 읽는 공간 미옥서원"
          subtitle="좋은 책을 발견하는 즐거움"
          imageUrl={storeHero?.imageUrl?.trim() || undefined}
          linkUrl={storeHero?.linkUrl?.trim() || '/'}
        />

        <div className="mx-auto mt-3 w-full max-w-[1400px] px-4 pb-4 sm:mt-6 sm:px-6 sm:pb-6">
          <div className="space-y-4 pt-3 sm:pt-6">
            <div className="flex min-h-[80px] items-center">
              <QuickNav />
            </div>
            {/*
              lg: 그리드 한 행 — 행 높이 = max(캐러셀 기본 10:4, 북콘서트 카드 자연 높이).
              카드가 더 크면 캐러셀만 세로로 늘어남(HeroCarousel lg:h-full). 표지 비율은 카드에서 고정.
            */}
            <div className="flex flex-col gap-6 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,10fr)_minmax(0,4fr)] lg:items-stretch lg:gap-7">
              <div className="flex min-w-0 min-h-0 flex-col">
                <HeroCarousel
                  banners={heroBannersForCarousel}
                  storeHero={
                    storeHero?.imageUrl?.trim()
                      ? undefined
                      : (storeHero ?? undefined)
                  }
                />
              </div>

              {/* 헤더는 flow 밖으로 올려 카드(표지 테두리) 상단 = 캐러셀 상단과 맞춤 */}
              <aside className="relative hidden h-full min-h-0 min-w-0 lg:flex lg:flex-col">
                <div className="absolute bottom-full left-0 right-0 z-10 mb-2 flex items-center justify-between border-b border-border bg-background pb-2">
                  <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">서점에서의 만남</h3>
                  <Link href="/concerts" className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary">
                    전체보기
                  </Link>
                </div>

                {concertCard ? (
                  <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                    <ConcertVerticalCard item={concertCard} variant="homeRail" />
                  </div>
                ) : null}
              </aside>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

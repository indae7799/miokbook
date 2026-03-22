'use client';

import Link from 'next/link';
import HeroStrip from '@/components/home/HeroStrip';
import QuickNav from '@/components/home/QuickNav';
import HeroCarousel from '@/components/home/HeroCarousel';
import EventCard from '@/components/events/EventCard';
import type { EventCardEvent } from '@/components/events/EventCard';

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
  demoEvent: EventCardEvent | null;
  /** SSR에서 이미 가져온 대문 이미지 */
  ssrStoreHero?: StoreHero | null;
  /** SSR에서 이미 가져온 히어로 배너 목록 */
  ssrHeroBanners?: HeroBanner[];
  /** CMS에서 설정한 "서점에서의 만남" 이벤트 카드 배경 이미지 */
  ssrMeetingImage?: { imageUrl: string } | null;
}

export default function HomeTopCmsClient({
  demoEvent,
  ssrStoreHero = null,
  ssrHeroBanners = [],
  ssrMeetingImage = null,
}: HomeTopCmsClientProps) {
  // SSR 데이터를 그대로 사용 — 클라이언트 fetch 제거 (Firestore reads 절감)
  const storeHero = ssrStoreHero;
  const heroBanners = (ssrHeroBanners ?? []).filter(
    (b) => (b.position ?? 'main_hero') === 'main_hero',
  );

  return (
    <section className="w-full">
      <div className="flex flex-col gap-6">
        <HeroStrip
          title="특별한 공간 미옥서원"
          subtitle="좋은 책을 발견하는 즐거움"
          imageUrl={storeHero?.imageUrl}
          linkUrl={storeHero?.linkUrl}
        />
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 w-full mt-3 sm:mt-6 pb-6 sm:pb-12">
          {/* 단일 그리드 시스템 도입 (2x2 구조) */}
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-x-8 gap-y-1.5 sm:gap-y-2 lg:gap-y-4 items-stretch pt-3 sm:pt-6">
            
            {/* ROW 1 Left: 퀵 내비게이션 */}
            <div className="flex items-center min-h-[80px]">
              <QuickNav />
            </div>

            {/* ROW 1 Right: 타이틀 (데스크탑 전용) */}
            <div className="hidden lg:flex items-center justify-between pb-1.5 border-b border-gray-100">
              <h3 className="text-xl font-bold tracking-tight text-gray-800">서점에서의 만남</h3>
              <Link href="/concerts" className="text-xs font-medium text-gray-400 hover:text-primary transition-colors">
                전체보기
              </Link>
            </div>

            {/* ROW 2 Left: 캐러셀 배너 */}
            <div className="w-full">
              <HeroCarousel banners={heroBanners} />
            </div>

            {/* ROW 2 Right: 이벤트 카드 (데스크탑 전용) */}
            <div className="hidden lg:block w-full">
              {demoEvent && (
                <div className="h-full">
                  <EventCard
                    event={demoEvent}
                    priority={!storeHero?.imageUrl}
                    imageUrlOverride={ssrMeetingImage?.imageUrl}
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

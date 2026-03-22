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
    (b) => (b.position ?? 'main_hero') === 'main_hero',
  );

  const concertCard = demoConcert
    ? { ...demoConcert, imageUrl: ssrMeetingImage?.imageUrl || demoConcert.imageUrl }
    : null;

  return (
    <section className="w-full">
      <div className="flex flex-col gap-6">
        <HeroStrip
          title="함께 읽는 공간 미옥서원"
          subtitle="좋은 책을 발견하는 즐거움"
          imageUrl={storeHero?.imageUrl}
          linkUrl={storeHero?.linkUrl}
        />
        <div className="mx-auto mt-3 w-full max-w-[1400px] px-4 pb-6 sm:mt-6 sm:px-6 sm:pb-12">
          <div className="grid items-stretch gap-x-8 gap-y-2 pt-3 sm:gap-y-3 sm:pt-6 lg:grid-cols-[7fr_3fr] lg:gap-y-4">
            <div className="flex min-h-[80px] items-center">
              <QuickNav />
            </div>

            <div className="hidden items-center justify-between border-b border-gray-100 pb-1.5 lg:flex">
              <h3 className="text-xl font-bold tracking-tight text-gray-800">서점에서의 만남</h3>
              <Link href="/concerts" className="text-xs font-medium text-gray-400 transition-colors hover:text-primary">
                전체보기
              </Link>
            </div>

            <div className="w-full">
              <HeroCarousel banners={heroBanners} />
            </div>

            <div className="hidden w-full lg:block">
              {concertCard ? (
                <div className="h-full">
                  <ConcertVerticalCard item={concertCard} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

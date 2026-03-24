import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { Suspense } from 'react';
import FeaturedCuration from '@/components/home/FeaturedCuration';
import { MainBottomBannerSlot } from '@/components/home/MainBottomBannerSlot';
import StorePopup from '@/components/store/StorePopup';
import HomeTopCmsClient from '@/components/home/HomeTopCmsClient';
import NewBooksGrid from '@/components/home/NewBooksGrid';
import BestsellerSection from '@/components/home/BestsellerSection';
import ThemeCuration from '@/components/home/ThemeCuration';
import ContentSection from '@/components/home/ContentSection';
import AboutBookstore from '@/components/home/AboutBookstore';
import StoreFooter from '@/components/home/StoreFooter';
import SidebarBannerSlot from '@/components/home/SidebarBannerSlot';
import ConcertVerticalCard from '@/components/concerts/ConcertVerticalCard';
import { getHomeBelowData, getHomeTopData, type HomeBelowData } from '@/lib/store/home';
import { getStorePopups, type StorePopupItem } from '@/lib/store/popups';
import type { BookCardBook } from '@/components/books/BookCard';
import type { ConcertVerticalCardItem } from '@/components/concerts/ConcertVerticalCard';

export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 3600;

export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
  },
};

async function HomeBelowFold({
  mobileConcert,
  meetingImage,
}: {
  mobileConcert: ConcertVerticalCardItem | null;
  meetingImage: { imageUrl: string } | null;
}) {
  let data: HomeBelowData = {
    mainBottomLeft: null,
    mainBottomRight: null,
    aboutBookstoreImage: null,
    allBanners: [],
    featured: { books: [], recommendationText: undefined },
    themeCurations: [],
    newBooks: [],
    bestsellers: [],
    articles: [],
    youtubeHomeItems: [],
  };

  try {
    data = await getHomeBelowData();
  } catch (error) {
    console.error('[HomeBelowFold] load failed:', error instanceof Error ? error.message : error);
  }

  const sidebarBanners = data.allBanners.filter((banner) => banner.position === 'sidebar');

  const demoCurationBooks: BookCardBook[] =
    data.featured.books.length > 0
      ? data.featured.books
      : [
          {
            isbn: 'demo-book-1',
            slug: 'demo-book',
            title: '서점의 온도: 우리가 사랑한 책과 이야기',
            author: '미옥서점',
            coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
            listPrice: 15000,
            salePrice: 13500,
            recommendationText: '서점의 결을 천천히 따라가며 읽기 좋은 책입니다.',
          },
      ];

  const mobileConcertCard = mobileConcert
    ? { ...mobileConcert, imageUrl: meetingImage?.imageUrl || mobileConcert.imageUrl }
    : null;

  return (
    <>
      <div className="mx-auto mt-10 max-w-[1400px] px-4 sm:mt-16 sm:px-6">
        <ThemeCuration items={data.themeCurations} title="이번 달 씨앤에이논술 선정도서" />
      </div>

      {sidebarBanners.length > 0 ? (
        <div className="mx-auto mt-10 max-w-[1400px] px-4 sm:mt-16 sm:px-6">
          <SidebarBannerSlot banners={sidebarBanners} square />
        </div>
      ) : null}

      {mobileConcertCard ? (
        <div className="mx-auto mt-2 max-w-[1400px] px-4 sm:px-6 md:hidden">
          <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-lg font-bold tracking-tight text-foreground">서점에서의 만남</h3>
          </div>
          <ConcertVerticalCard item={mobileConcertCard} variant="homeRail" />
        </div>
      ) : null}

      <div className="mx-auto mt-12 max-w-[1400px] px-4 sm:mt-[120px] sm:px-6">
        <FeaturedCuration
          books={demoCurationBooks}
          title="MD 추천"
          viewAllHref={data.featured.books.length > 0 ? '/curation/md' : undefined}
          mainBottomLeft={data.mainBottomLeft}
          mainBottomRight={data.mainBottomRight}
        />
      </div>

      <div className="mx-auto mt-10 max-w-[1400px] px-4 sm:mt-[120px] sm:px-6">
        <BestsellerSection books={data.bestsellers} title="오늘의 베스트셀러" />
      </div>

      <div className="mt-10 w-full sm:mt-[120px]">
        <AboutBookstore
          title="대량구매 서비스"
          description="단체 도서 구매를 온라인으로 간편하게. 견적부터 배송까지 한 번에 안내합니다."
          ctaLabel="견적 문의하기"
          ctaHref="/bulk-order"
          imageUrl={data.aboutBookstoreImage?.imageUrl}
        />
      </div>

      <div className="mx-auto mt-10 max-w-[1400px] px-4 sm:mt-[120px] sm:px-6">
        <NewBooksGrid books={data.newBooks} title="금주 출간된 책들" />
      </div>

      <div className="mx-auto mt-5 max-w-[1400px] px-4 sm:mt-[120px] sm:px-6">
        <ContentSection articles={data.articles} youtubeItems={data.youtubeHomeItems} />
      </div>

      <div className="mx-auto mt-10 block w-full max-w-[1400px] px-4 sm:px-6 md:hidden">
        <MainBottomBannerSlot banner={data.mainBottomRight} emptyLabel="메인 하단 배너 영역" />
      </div>

      <StoreFooter />
    </>
  );
}

export default async function HomePage() {
  let storeHero: { imageUrl: string; linkUrl: string } | null = null;
  let heroBanners: { id: string; imageUrl: string; linkUrl: string; position: string }[] = [];
  let demoConcert: ConcertVerticalCardItem | null = null;
  let meetingAtBookstoreImage: { imageUrl: string } | null = null;
  let popups: StorePopupItem[] = [];

  try {
    const [top, popupItems] = await Promise.all([getHomeTopData(), getStorePopups()]);
    storeHero = top.storeHero;
    heroBanners = top.heroBanners;
    demoConcert = top.demoConcert;
    meetingAtBookstoreImage = top.meetingAtBookstoreImage;
    popups = popupItems;

    for (const popup of popupItems) {
      if (popup.imageUrl) {
        preload(popup.imageUrl, { as: 'image', fetchPriority: 'high' });
      }
    }
  } catch (error) {
    console.error('[HomePage] load failed:', error instanceof Error ? error.message : error);
  }

  const displayConcert: ConcertVerticalCardItem = demoConcert ?? {
    id: 'demo-concert',
    title: '미옥서원 북콘서트: 작가와의 만남',
    slug: 'demo-concert',
    imageUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&q=80&w=1600',
    date: '2026-04-04T00:00:00.000Z',
    statusBadge: '예약중',
    feeLabel: '참가비 안내',
    description: '아름다운 서점 공간에서 작가와 독자가 가까이 만나는 북콘서트입니다.',
  };

  return (
    <main className="min-h-screen pb-10">
      <StorePopup initialPopups={popups} />
      <HomeTopCmsClient
        demoConcert={displayConcert}
        ssrStoreHero={storeHero}
        ssrHeroBanners={heroBanners}
        ssrMeetingImage={meetingAtBookstoreImage}
      />
      <Suspense
        fallback={
          <div className="mx-auto mt-16 max-w-[1400px] px-4 text-sm text-muted-foreground sm:px-6">
            콘텐츠를 불러오는 중...
          </div>
        }
      >
        <HomeBelowFold mobileConcert={displayConcert} meetingImage={meetingAtBookstoreImage} />
      </Suspense>
    </main>
  );
}

import type { Metadata } from 'next';
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
import { getHomeBelowData, getHomeTopData, type HomeBelowData } from '@/lib/store/home';
import { getStorePopups, type StorePopupItem } from '@/lib/store/popups';
import { Suspense } from 'react';
import type { BookCardBook } from '@/components/books/BookCard';
import type { ConcertVerticalCardItem } from '@/components/concerts/ConcertVerticalCard';

export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 3600;

/** 홈(/)이 공식 랜딩임을 메타데이터로 명시 (canonical·og:url) */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
  openGraph: {
    url: '/',
  },
};

async function HomeBelowFold() {
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
  } catch (e) {
    console.error('[HomeBelowFold] load failed:', e instanceof Error ? e.message : e);
  }

  const sidebarBanners = data.allBanners.filter((b) => b.position === 'sidebar');

  const demoCurationBooks: BookCardBook[] =
    data.featured.books.length > 0
      ? data.featured.books
      : [
          {
            isbn: 'demo-book-1',
            slug: 'demo-book',
            title: '서점의 온도: 우리가 사랑한 책방 이야기',
            author: '미옥 서점인',
            coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
            listPrice: 15000,
            salePrice: 13500,
            recommendationText: '서점의 결을 천천히 따라가며 읽기 좋은 책입니다.',
          },
        ];

  return (
    <>
      <div className="mx-auto mt-6 max-w-[1400px] px-4 sm:mt-16 sm:px-6">
        <ThemeCuration items={data.themeCurations} title="이번 달 씨앤에이논술 선정도서" />
      </div>

      {sidebarBanners.length > 0 ? (
        <div className="mx-auto mt-6 max-w-[1400px] px-4 sm:mt-16 sm:px-6">
          <SidebarBannerSlot banners={sidebarBanners} square />
        </div>
      ) : null}

      <div className="mx-auto mt-8 max-w-[1400px] px-4 sm:mt-[120px] sm:px-6">
        <FeaturedCuration
          books={demoCurationBooks}
          title="MD 추천"
          viewAllHref={data.featured.books.length > 0 ? '/curation/md' : undefined}
          mainBottomLeft={data.mainBottomLeft}
          mainBottomRight={data.mainBottomRight}
        />
      </div>

      <div className="mx-auto mt-8 max-w-[1400px] px-4 sm:mt-[120px] sm:px-6">
        <BestsellerSection books={data.bestsellers} title="오늘의 베스트셀러" />
      </div>

      <div className="mt-8 w-full sm:mt-[120px]">
        <AboutBookstore
          title="대량 구매 서비스"
          description="단체 도서 구매를 온라인으로 간편하게. 견적부터 배송까지 한 번에."
          ctaLabel="견적 문의하기"
          ctaHref="/bulk-order"
          imageUrl={data.aboutBookstoreImage?.imageUrl}
        />
      </div>

      <div className="mx-auto mt-8 max-w-[1400px] px-4 sm:mt-[120px] sm:px-6">
        <NewBooksGrid books={data.newBooks} title="금주 출간된 책들" />
      </div>

      <div className="mx-auto mt-8 max-w-[1400px] px-4 sm:mt-[120px] sm:px-6">
        <ContentSection articles={data.articles} youtubeItems={data.youtubeHomeItems} />
      </div>

      {/* md 미만만: CMS 메인 하단 ‘우측’ 배너를 MD 추천 구역 밖·푸터 바로 위에만 둠 (768px 이상은 FeaturedCuration 하단 2열에 표시). */}
      <div className="mx-auto mt-8 block w-full max-w-[1400px] px-4 sm:px-6 md:hidden">
        <MainBottomBannerSlot banner={data.mainBottomRight} emptyLabel="메인 하단 배너 우측" />
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
  } catch (e) {
    console.error('[HomePage] load failed:', e instanceof Error ? e.message : e);
  }

  const FIXED_CONCERT_TITLE = '미옥서원 북콘서트: 작가와의 만남';
  const FIXED_CONCERT_DESCRIPTION = '아름다운 서점 공간에서 작가와 독자가 가까이 만나는 특별한 만남.';

  const displayConcert: ConcertVerticalCardItem = demoConcert
    ? { ...demoConcert, title: FIXED_CONCERT_TITLE, description: FIXED_CONCERT_DESCRIPTION }
    : {
        id: 'demo-concert',
        title: '미옥서원 북콘서트: 작가와의 만남',
        slug: 'demo-concert',
        imageUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&q=80&w=1600',
        date: new Date(Date.now() + 86400000 * 7).toISOString(),
        statusBadge: '예약중',
        feeLabel: '참가비 안내',
        description: FIXED_CONCERT_DESCRIPTION,
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
        <HomeBelowFold />
      </Suspense>
    </main>
  );
}

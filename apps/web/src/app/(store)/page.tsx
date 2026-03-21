import FeaturedCuration from '@/components/home/FeaturedCuration';
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
import { Suspense } from 'react';
import type { EventCardEvent } from '@/components/events/EventCard';
import type { BookCardBook } from '@/components/books/BookCard';

/**
 * [수정] revalidate 대폭 상향
 *
 * 기존: 개발 30초 / 배포 300초(5분)
 * → 개발 30초는 1시간 개발 시 120회 SSR 재실행 = Firestore reads 수백~수천 소모.
 *
 * 홈 CMS 데이터(배너/베스트셀러/신간)는 실시간성이 낮음.
 * 배포: 1시간(3600초) 캐시로 reads 95% 절감.
 * 개발: 5분(300초)으로 HMR reads 차단.
 *
 * 긴급 갱신 필요 시: 어드민에서 revalidate API 호출 또는 재배포.
 */
export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 3600;

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
    console.error('[HomeBelowFold] 데이터 로드 실패:', e instanceof Error ? e.message : e);
    if (e instanceof Error && e.stack) console.error(e.stack);
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
            coverImage:
              'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400',
            listPrice: 15000,
            salePrice: 13500,
            recommendationText:
              '이 서점의 따뜻한 분위기를 닮은 책입니다. 첫 페이지부터 마지막까지 위안이 될 거예요.',
          },
        ];

  return (
    <>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-[120px]">
        <ThemeCuration items={data.themeCurations} title="이번 달 씨앤에이논술 선정도서" />
      </div>

      {sidebarBanners.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-16">
          <SidebarBannerSlot banners={sidebarBanners} square />
        </div>
      )}

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-[120px]">
        <FeaturedCuration
          books={demoCurationBooks}
          title="MD의 추천"
          viewAllHref={data.featured.books.length > 0 ? '/curation/md' : undefined}
          mainBottomLeft={data.mainBottomLeft}
          mainBottomRight={data.mainBottomRight}
        />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-[120px] space-y-[120px]">
        <BestsellerSection books={data.bestsellers} title="오늘의 베스트셀러" />
      </div>

      <div className="w-full mt-[120px]">
        <AboutBookstore
          title="대량 구매 서비스"
          description="단체 도서 구매를 온라인으로 간편하게. 견적부터 배송까지 한번에!"
          ctaLabel="견적 문의하기"
          ctaHref="/bulk-order"
          imageUrl={data.aboutBookstoreImage?.imageUrl}
        />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-[120px] space-y-[120px]">
        <NewBooksGrid books={data.newBooks} title="금주 출간된 새 책들" />
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-[120px] space-y-[120px]">
        <ContentSection articles={data.articles} youtubeItems={data.youtubeHomeItems} />
        <StoreFooter />
      </div>
    </>
  );
}

export default async function HomePage() {
  let storeHero: { imageUrl: string; linkUrl: string } | null = null;
  let heroBanners: { id: string; imageUrl: string; linkUrl: string; position: string }[] = [];
  let demoEvent: EventCardEvent | null = null;
  let meetingAtBookstoreImage: { imageUrl: string } | null = null;

  try {
    const top = await getHomeTopData();
    storeHero = top.storeHero;
    heroBanners = top.heroBanners;
    demoEvent = top.demoEvent;
    meetingAtBookstoreImage = top.meetingAtBookstoreImage;
  } catch (e) {
    console.error('[HomePage] 데이터 로드 실패:', e instanceof Error ? e.message : e);
    if (e instanceof Error && e.stack) console.error(e.stack);
  }

  const demoEvents: EventCardEvent[] = demoEvent
    ? [demoEvent]
    : [
        {
          eventId: 'demo-event-1',
          title: '미옥서원 릴레이 북콘서트: 작가와의 만남',
          type: 'book_concert',
          description: '아름다운 서점에서 열리는 특별한 밤의 강연',
          imageUrl:
            'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&q=80&w=1600',
          date: new Date(Date.now() + 86400000 * 7).toISOString(),
          capacity: 30,
          registeredCount: 12,
        },
      ];

  return (
    <main className="min-h-screen pb-10">
      <StorePopup />
      <HomeTopCmsClient
        demoEvent={demoEvents[0] ?? null}
        ssrStoreHero={storeHero}
        ssrHeroBanners={heroBanners}
        ssrMeetingImage={meetingAtBookstoreImage}
      />
      <Suspense
        fallback={
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-16 text-sm text-muted-foreground">
            콘텐츠 불러오는 중...
          </div>
        }
      >
        <HomeBelowFold />
      </Suspense>
    </main>
  );
}

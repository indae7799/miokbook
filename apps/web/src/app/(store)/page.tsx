import { adminDb } from '@/lib/firebase/admin';
import HeroCarousel from '@/components/home/HeroCarousel';
import type { HeroBanner } from '@/components/home/HeroCarousel';
import type { BookCardBook } from '@/components/books/BookCard';
import QuickNav from '@/components/home/QuickNav';
import FeaturedCuration from '@/components/home/FeaturedCuration';
import MonthlyPick from '@/components/home/MonthlyPick';
import NewBooksGrid from '@/components/home/NewBooksGrid';
import BestsellerSection from '@/components/home/BestsellerSection';
import ThemeCuration from '@/components/home/ThemeCuration';
import EventsSection from '@/components/home/EventsSection';
import ContentSection from '@/components/home/ContentSection';
import AboutBookstore from '@/components/home/AboutBookstore';
import CategoryGrid from '@/components/home/CategoryGrid';
import StoreFooter from '@/components/home/StoreFooter';
import type { ThemeCurationItem } from '@/components/home/ThemeCuration';
import type { EventCardEvent } from '@/components/events/EventCard';
import type { ArticleCardArticle } from '@/components/content/ArticleCard';

export const revalidate = 300;

interface CmsHomeDoc {
  heroBanners?: Array<{
    id: string;
    imageUrl: string;
    linkUrl: string;
    isActive?: boolean;
    startDate?: { toDate: () => Date };
    endDate?: { toDate: () => Date };
    order?: number;
  }>;
  featuredBooks?: Array<{
    isbn: string;
    title: string;
    coverImage: string;
    priority: number;
    recommendationText?: string;
  }>;
  monthlyPick?: {
    isbn: string;
    title: string;
    coverImage: string;
    description?: string;
  } | null;
  themeCurations?: Array<{ id: string; title: string; isbns: string[]; order?: number }>;
}

function now(): Date {
  return new Date();
}

async function getHeroBanners(): Promise<HeroBanner[]> {
  if (!adminDb) return [];
  try {
  const doc = await adminDb.collection('cms').doc('home').get();
  const d = doc.data() as CmsHomeDoc | undefined;
  const raw = (d?.heroBanners ?? []).filter((b) => b.isActive !== false);
  const today = now().getTime();
  const list = raw
    .map((b) => ({
      id: b.id,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      startDate: b.startDate?.toDate?.()?.getTime() ?? 0,
      endDate: b.endDate?.toDate?.()?.getTime() ?? Infinity,
      order: b.order ?? 0,
    }))
    .filter((b) => today >= b.startDate && today <= b.endDate)
    .sort((a, b) => a.order - b.order);
  return list.map(({ id, imageUrl, linkUrl }) => ({ id, imageUrl, linkUrl }));
  } catch {
    return [];
  }
}

async function getFeaturedBooksAsCardBooks(): Promise<{ books: BookCardBook[]; recommendationText?: string }> {
  if (!adminDb) return { books: [] };
  try {
  const doc = await adminDb.collection('cms').doc('home').get();
  const d = doc.data() as CmsHomeDoc | undefined;
  const featured = (d?.featuredBooks ?? []).slice().sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  const recommendationText = featured[0]?.recommendationText;
  if (featured.length === 0) return { books: [] };
  const out: BookCardBook[] = [];
  for (const f of featured) {
    const bookSnap = await adminDb.collection('books').doc(f.isbn).get();
    const b = bookSnap.data();
    if (!b) continue;
    out.push({
      isbn: f.isbn,
      slug: b.slug ?? '',
      title: b.title ?? f.title,
      author: b.author ?? '',
      coverImage: b.coverImage ?? f.coverImage,
      listPrice: Number(b.listPrice ?? 0),
      salePrice: Number(b.salePrice ?? 0),
    });
  }
  return { books: out, recommendationText };
  } catch {
    return { books: [] };
  }
}

async function getMonthlyPick(): Promise<{ isbn: string; slug: string; title: string; coverImage: string; description?: string } | null> {
  if (!adminDb) return null;
  try {
  const doc = await adminDb.collection('cms').doc('home').get();
  const pick = (doc.data() as CmsHomeDoc | undefined)?.monthlyPick;
  if (!pick?.isbn) return null;
  const bookSnap = await adminDb.collection('books').doc(pick.isbn).get();
  const b = bookSnap.data();
  if (!b) return null;
  return {
    isbn: pick.isbn,
    slug: b.slug ?? pick.isbn,
    title: b.title ?? pick.title,
    coverImage: b.coverImage ?? pick.coverImage,
    description: pick.description ?? (b.description as string | undefined),
  };
  } catch {
    return null;
  }
}

async function getThemeCurationsWithBooks(): Promise<ThemeCurationItem[]> {
  if (!adminDb) return [];
  try {
  const doc = await adminDb.collection('cms').doc('home').get();
  const themes = (doc.data() as CmsHomeDoc | undefined)?.themeCurations ?? [];
  const sorted = themes.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const out: ThemeCurationItem[] = [];
  for (const t of sorted) {
    const books: BookCardBook[] = [];
    for (const isbn of t.isbns) {
      const bookSnap = await adminDb.collection('books').doc(isbn).get();
      const b = bookSnap.data();
      if (!b || !b.isActive) continue;
      books.push({
        isbn,
        slug: b.slug ?? '',
        title: b.title ?? '',
        author: b.author ?? '',
        coverImage: b.coverImage ?? '',
        listPrice: Number(b.listPrice ?? 0),
        salePrice: Number(b.salePrice ?? 0),
      });
    }
    if (books.length > 0) out.push({ id: t.id, title: t.title, books });
  }
  return out;
  } catch {
    return [];
  }
}

async function getNewBooks(limit: number): Promise<BookCardBook[]> {
  if (!adminDb) return [];
  try {
  const snap = await adminDb.collection('books').orderBy('createdAt', 'desc').limit(limit * 2).get();
  const filtered = snap.docs.filter((doc) => doc.data().isActive === true).slice(0, limit);
  return filtered.map((doc) => {
    const d = doc.data();
    return {
      isbn: doc.id,
      slug: d.slug ?? '',
      title: d.title ?? '',
      author: d.author ?? '',
      coverImage: d.coverImage ?? '',
      listPrice: Number(d.listPrice ?? 0),
      salePrice: Number(d.salePrice ?? 0),
    };
  });
  } catch {
    return [];
  }
}

async function getBestsellers(limit: number): Promise<BookCardBook[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb
      .collection('books')
      .where('isActive', '==', true)
      .orderBy('salesCount', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        isbn: doc.id,
        slug: d.slug ?? '',
        title: d.title ?? '',
        author: d.author ?? '',
        coverImage: d.coverImage ?? '',
        listPrice: Number(d.listPrice ?? 0),
        salePrice: Number(d.salePrice ?? 0),
      };
    });
  } catch {
    return [];
  }
}

async function getEventsForHome(limit: number): Promise<EventCardEvent[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb
      .collection('events')
      .where('isActive', '==', true)
      .orderBy('date', 'asc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      const date = d.date?.toDate?.() ?? d.date;
      return {
        eventId: doc.id,
        title: d.title ?? '',
        type: d.type ?? '',
        description: d.description,
        imageUrl: d.imageUrl ?? '',
        date: date instanceof Date ? date.toISOString() : String(date ?? ''),
        location: d.location,
        capacity: Number(d.capacity ?? 0),
        registeredCount: Number(d.registeredCount ?? 0),
      };
    });
  } catch {
    return [];
  }
}

async function getArticlesForHome(limit: number): Promise<ArticleCardArticle[]> {
  if (!adminDb) return [];
  try {
    const snap = await adminDb
      .collection('articles')
      .where('isPublished', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    return snap.docs.map((doc) => {
      const d = doc.data();
      return {
        articleId: doc.id,
        slug: d.slug ?? '',
        type: d.type ?? '',
        title: d.title ?? '',
        thumbnailUrl: d.thumbnailUrl ?? '',
      };
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  let heroBanners: HeroBanner[] = [];
  let featured: { books: BookCardBook[]; recommendationText?: string } = { books: [] };
  let monthlyPick: { isbn: string; slug: string; title: string; coverImage: string; description?: string } | null = null;
  let themeCurations: ThemeCurationItem[] = [];
  let newBooks: BookCardBook[] = [];
  let bestsellers: BookCardBook[] = [];
  let events: EventCardEvent[] = [];
  let articles: ArticleCardArticle[] = [];

  try {
    [heroBanners, featured, monthlyPick, themeCurations, newBooks, bestsellers, events, articles] = await Promise.all([
      getHeroBanners(),
      getFeaturedBooksAsCardBooks(),
      getMonthlyPick(),
      getThemeCurationsWithBooks(),
      getNewBooks(8),
      getBestsellers(10),
      getEventsForHome(3),
      getArticlesForHome(3),
    ]);
  } catch {
    // Firestore/환경 오류 시 빈 데이터로 렌더 (500 방지)
  }

  return (
    <main className="min-h-screen space-y-10 pb-10">
      {/* PRD 8 랜딩 구조: 2 Hero → 3 QuickNav → 4 Bestseller → 5 Featured → 6 Monthly → 7 NewBooks → 8 CategoryGrid → 9 Theme → 10 Events → 11 Content → 12 About → 13 Footer */}
      <HeroCarousel banners={heroBanners} />
      <QuickNav />
      <BestsellerSection books={bestsellers} />
      <FeaturedCuration
        books={featured.books}
        recommendationText={featured.recommendationText}
        title="독립서점 추천"
      />
      {monthlyPick && (
        <MonthlyPick
          isbn={monthlyPick.isbn}
          slug={monthlyPick.slug}
          title={monthlyPick.title}
          coverImage={monthlyPick.coverImage}
          description={monthlyPick.description}
        />
      )}
      <NewBooksGrid books={newBooks} />
      <CategoryGrid />
      <ThemeCuration items={themeCurations} />
      <EventsSection events={events} />
      <ContentSection articles={articles} />
      <AboutBookstore />
      <StoreFooter />
    </main>
  );
}

import { adminDb } from '@/lib/firebase/admin';
import HeroCarousel from '@/components/home/HeroCarousel';
import BookCarousel from '@/components/books/BookCarousel';
import BookCard from '@/components/books/BookCard';
import type { BookCardBook } from '@/components/books/BookCard';
import type { HeroBanner } from '@/components/home/HeroCarousel';

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
}

function now(): Date {
  return new Date();
}

async function getHeroBanners(): Promise<HeroBanner[]> {
  if (!adminDb) return [];
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
}

async function getFeaturedBooksAsCardBooks(): Promise<BookCardBook[]> {
  if (!adminDb) return [];
  const doc = await adminDb.collection('cms').doc('home').get();
  const d = doc.data() as CmsHomeDoc | undefined;
  const featured = (d?.featuredBooks ?? []).slice().sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
  if (featured.length === 0) return [];
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
  return out;
}

async function getNewBooks(limit: number): Promise<BookCardBook[]> {
  if (!adminDb) return [];
  const snap = await adminDb
    .collection('books')
    .orderBy('createdAt', 'desc')
    .limit(limit * 2)
    .get();
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
}

export default async function HomePage() {
  const [heroBanners, featuredBooks, newBooks] = await Promise.all([
    getHeroBanners(),
    getFeaturedBooksAsCardBooks(),
    getNewBooks(8),
  ]);

  return (
    <main className="min-h-screen space-y-10 pb-10">
      <HeroCarousel banners={heroBanners} />
      <BookCarousel books={featuredBooks} title="독립서점 추천" />
      <section className="px-1">
        <h2 className="text-lg font-semibold mb-3">신간 도서</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {newBooks.map((book) => (
            <BookCard key={book.isbn} book={book} />
          ))}
        </div>
        {newBooks.length === 0 && (
          <p className="text-muted-foreground text-sm py-8">등록된 신간 도서가 없습니다.</p>
        )}
      </section>
    </main>
  );
}

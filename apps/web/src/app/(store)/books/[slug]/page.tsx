import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { adminDb } from '@/lib/firebase/admin';
import BookDetail from '@/components/books/BookDetail';
import type { BookDetailBook } from '@/components/books/BookDetail';

const ISBN13_REGEX = /^978\d{10}$/;

/** PRD: slug에서 isbn 추출 — 마지막 13자리 (978 + 10자리) */
function isbnFromSlug(slug: string): string | null {
  const last13 = slug.slice(-13);
  return ISBN13_REGEX.test(last13) ? last13 : null;
}

async function getRecommendedBooks(category: string, excludeIsbn: string, limit: number): Promise<BookDetailBook[]> {
  if (!adminDb || !category) return [];
  try {
    const snap = await adminDb
      .collection('books')
      .where('category', '==', category)
      .where('isActive', '==', true)
      .limit(limit + 5)
      .get();
    const list: BookDetailBook[] = [];
    for (const doc of snap.docs) {
      if (doc.id === excludeIsbn) continue;
      if (list.length >= limit) break;
      const d = doc.data();
      const pub = d.publishDate?.toDate?.() ?? d.publishDate;
      list.push({
        isbn: doc.id,
        slug: String(d.slug ?? doc.id),
        title: String(d.title ?? ''),
        author: String(d.author ?? ''),
        publisher: String(d.publisher ?? ''),
        description: String(d.description ?? ''),
        coverImage: String(d.coverImage ?? ''),
        listPrice: Number(d.listPrice ?? 0),
        salePrice: Number(d.salePrice ?? 0),
        category: String(d.category ?? ''),
        status: String(d.status ?? ''),
        publishDate: pub instanceof Date ? pub.toISOString() : pub,
        rating: Number(d.rating ?? 0),
        reviewCount: Number(d.reviewCount ?? 0),
      });
    }
    return list;
  } catch {
    return [];
  }
}

async function getBookAndAvailable(slug: string): Promise<{ book: BookDetailBook; available: number; recommended: BookDetailBook[] } | null> {
  if (!adminDb) return null;
  const isbn = isbnFromSlug(slug);
  if (!isbn) return null;

  const [bookSnap, invSnap] = await Promise.all([
    adminDb.collection('books').doc(isbn).get(),
    adminDb.collection('inventory').doc(isbn).get(),
  ]);

  if (!bookSnap.exists) return null;
  const d = bookSnap.data()!;
  const stock = Number(invSnap.exists ? invSnap.data()?.stock ?? 0 : 0);
  const reserved = Number(invSnap.exists ? invSnap.data()?.reserved ?? 0 : 0);
  const available = Math.max(0, stock - reserved);

  const publishDate = d.publishDate?.toDate?.() ?? d.publishDate;

  const book: BookDetailBook = {
    isbn,
    slug: String(d.slug ?? slug),
    title: String(d.title ?? ''),
    author: String(d.author ?? ''),
    publisher: String(d.publisher ?? ''),
    description: String(d.description ?? ''),
    coverImage: String(d.coverImage ?? ''),
    listPrice: Number(d.listPrice ?? 0),
    salePrice: Number(d.salePrice ?? 0),
    category: String(d.category ?? ''),
    status: String(d.status ?? ''),
    publishDate: publishDate instanceof Date ? publishDate.toISOString() : publishDate,
    rating: Number(d.rating ?? 0),
    reviewCount: Number(d.reviewCount ?? 0),
    tableOfContents: typeof d.tableOfContents === 'string' ? d.tableOfContents : undefined,
  };

  const recommended = await getRecommendedBooks(book.category, isbn, 4);
  return { book, available, recommended };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBookAndAvailable(slug);
  if (!data) return { title: '도서 없음' };

  const { book } = data;
  const title = `${book.title} | 온라인 독립서점`;
  const description = book.description?.slice(0, 160) ?? `${book.title} - ${book.author}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: book.coverImage ? [{ url: book.coverImage, alt: book.title }] : [],
      type: 'book',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: book.coverImage ? [book.coverImage] : undefined,
    },
  };
}

export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getBookAndAvailable(slug);
  if (!data) notFound();

  return (
    <main className="min-h-screen py-6">
      <BookDetail book={data.book} available={data.available} recommendedBooks={data.recommended} />
    </main>
  );
}

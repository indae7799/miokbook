import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BookDetail from '@/components/books/BookDetail';
import StoreFooter from '@/components/home/StoreFooter';
import { getBookAndAvailableBySlug, getBookMetaBySlug } from '@/lib/store/bookDetail';

/**
 * 도서 상세 ISR 캐싱.
 * revalidate 없으면 매 방문마다 Firestore 2~4 reads 발생 → 50,000/일 순삭.
 * 개발: 5분(300초) / 프로덕션: 1시간(3600초)
 */
export const revalidate = process.env.NODE_ENV === 'development' ? 300 : 3600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookMetaBySlug(slug);
  if (!book) return { title: '도서 없음' };

  const title = `${book.title} | 미옥서원`;
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

function ProductJsonLd({
  name,
  description,
  image,
  isbn,
  author,
  publisher,
  price,
  priceCurrency,
  availability,
  rating,
  reviewCount,
}: {
  name: string;
  description: string;
  image: string;
  isbn: string;
  author?: string;
  publisher?: string;
  price: number;
  priceCurrency: string;
  availability: 'InStock' | 'OutOfStock';
  rating: number;
  reviewCount: number;
}) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name,
    description: description?.slice(0, 500) ?? name,
    image: image || undefined,
    isbn,
    author: author ? { '@type': 'Person', name: author } : undefined,
    publisher: publisher ? { '@type': 'Organization', name: publisher } : undefined,
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency,
      itemCondition: 'https://schema.org/NewCondition',
      availability: `https://schema.org/${availability}`,
    },
  };
  if (reviewCount > 0 && rating >= 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating,
      reviewCount,
      bestRating: 5,
    };
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function BookDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getBookAndAvailableBySlug(slug);
  if (!data) notFound();

  const { book, available } = data;
  const price = book.salePrice > 0 ? book.salePrice : book.listPrice;

  return (
    <>
      <main className="min-h-screen py-6">
        <div className="max-w-[1000px] mx-auto px-4">
          <ProductJsonLd
            name={book.title}
            description={book.description ?? book.title}
            image={book.coverImage}
            isbn={book.isbn}
            author={book.author}
            publisher={book.publisher}
            price={price}
            priceCurrency="KRW"
            availability={available > 0 ? 'InStock' : 'OutOfStock'}
            rating={book.rating ?? 0}
            reviewCount={book.reviewCount ?? 0}
          />
          <BookDetail book={data.book} available={data.available} recommendedBooks={data.recommended} />
        </div>
      </main>
      <StoreFooter />
    </>
  );
}

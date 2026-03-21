import Link from 'next/link';
import { getCmsHome, getFeaturedBooksAsCardBooks } from '@/lib/cmsHome';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';

export const revalidate = 300;

export const metadata = {
  title: 'MD의 선택',
  description: '큐레이터가 고른 추천 도서를 한곳에서 만나 보세요.',
};

export default async function MdCurationPage() {
  const [cms, books] = await Promise.all([getCmsHome(), getFeaturedBooksAsCardBooks()]);
  const recommendationText = cms.featuredBooks[0]?.recommendationText;

  return (
    <main className="mx-auto min-h-screen max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/curation">← 큐레이션</Link>
        </Button>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">MD의 선택</h1>
      {recommendationText && <p className="mt-1 text-sm text-muted-foreground">{recommendationText}</p>}
      <p className="mt-2 text-sm text-muted-foreground">CMS에서 등록한 MD 추천 도서만 표시됩니다.</p>

      {books.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">등록된 추천 도서가 없습니다.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 justify-items-center gap-[19px] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {books.map((book, i) => (
            <BookCard key={book.isbn} book={book} compact showCart={false} priority={i < 6} hidePrice smallerCover80 />
          ))}
        </div>
      )}
    </main>
  );
}

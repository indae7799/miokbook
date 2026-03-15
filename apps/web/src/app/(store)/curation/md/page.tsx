import Link from 'next/link';
import { getCmsHome, getFeaturedBooksAsCardBooks } from '@/lib/cmsHome';
import BookCarousel from '@/components/books/BookCarousel';
import { Button } from '@/components/ui/button';

export const revalidate = 300;

export default async function MdCurationPage() {
  const [cms, books] = await Promise.all([getCmsHome(), getFeaturedBooksAsCardBooks()]);
  const recommendationText = cms.featuredBooks[0]?.recommendationText;

  return (
    <main className="min-h-screen py-6">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/curation">← 큐레이션</Link>
        </Button>
      </div>
      <h1 className="text-2xl font-semibold mb-2">MD 추천</h1>
      {recommendationText && <p className="text-muted-foreground text-sm mb-4">{recommendationText}</p>}
      {books.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">등록된 추천 도서가 없습니다.</p>
      ) : (
        <BookCarousel books={books} />
      )}
    </main>
  );
}

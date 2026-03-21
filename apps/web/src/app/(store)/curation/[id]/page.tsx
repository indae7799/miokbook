import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getThemeCurationById } from '@/lib/cmsHome';
import BookCarousel from '@/components/books/BookCarousel';
import { Button } from '@/components/ui/button';

export const revalidate = 300;

export default async function ThemeCurationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const theme = await getThemeCurationById(id);
  if (!theme) notFound();

  return (
    <main className="min-h-screen py-6 max-w-[1200px] mx-auto px-4">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/curation">← 큐레이션</Link>
        </Button>
      </div>
      <h1 className="text-2xl font-semibold mb-2">{theme.title}</h1>
      {theme.description && (
        <p className="text-muted-foreground mb-4">{theme.description}</p>
      )}
      {theme.books.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8">등록된 도서가 없습니다.</p>
      ) : (
        <BookCarousel books={theme.books} />
      )}
    </main>
  );
}

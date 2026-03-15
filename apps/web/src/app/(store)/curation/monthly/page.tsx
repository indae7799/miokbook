import Link from 'next/link';
import { getCmsHome, getMonthlyPickBook } from '@/lib/cmsHome';
import BookCard from '@/components/books/BookCard';
import { Button } from '@/components/ui/button';

export const revalidate = 300;

export default async function MonthlyCurationPage() {
  const [cms, book] = await Promise.all([getCmsHome(), getMonthlyPickBook()]);
  const monthlyPick = cms.monthlyPick;

  return (
    <main className="min-h-screen py-6">
      <div className="mb-4">
        <Button variant="ghost" asChild>
          <Link href="/curation">← 큐레이션</Link>
        </Button>
      </div>
      <h1 className="text-2xl font-semibold mb-4">이달의 책</h1>
      {!monthlyPick && !book ? (
        <p className="text-muted-foreground text-sm py-8">이달의 책이 아직 선정되지 않았습니다.</p>
      ) : book ? (
        <div className="max-w-xs">
          {monthlyPick?.description && (
            <p className="text-muted-foreground text-sm mb-4">{monthlyPick.description}</p>
          )}
          <BookCard book={book} />
        </div>
      ) : null}
    </main>
  );
}

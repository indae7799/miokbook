import Link from 'next/link';
import { getCmsHome, type CmsHomeData } from '@/lib/cmsHome';

export const revalidate = 300;

export default async function CurationPage() {
  let cms: CmsHomeData = { featuredBooks: [], monthlyPick: null, themeCurations: [] };
  try {
    cms = await getCmsHome();
  } catch {
    // 500 방지
  }
  const { featuredBooks, monthlyPick, themeCurations } = cms;

  return (
    <main className="min-h-screen py-6 space-y-8">
      <h1 className="text-2xl font-semibold">큐레이션</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/curation/md"
          className="flex min-h-[48px] items-center justify-center rounded-lg border border-border bg-card p-6 font-medium hover:bg-accent"
        >
          MD 추천 {featuredBooks.length > 0 && `(${featuredBooks.length}종)`}
        </Link>
        <Link
          href="/curation/monthly"
          className="flex min-h-[48px] items-center justify-center rounded-lg border border-border bg-card p-6 font-medium hover:bg-accent"
        >
          이달의 책 {monthlyPick && '(1종)'}
        </Link>
        {themeCurations.map((t) => (
          <Link
            key={t.id}
            href={`/curation/${t.id}`}
            className="flex min-h-[48px] items-center justify-center rounded-lg border border-border bg-card p-6 font-medium hover:bg-accent"
          >
            {t.title}
          </Link>
        ))}
      </div>
      {featuredBooks.length === 0 && !monthlyPick && themeCurations.length === 0 && (
        <p className="text-muted-foreground text-sm">등록된 큐레이션이 없습니다.</p>
      )}
    </main>
  );
}

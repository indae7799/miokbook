import Link from 'next/link';
import { BOOK_CATEGORIES } from '@/lib/categories';

/** 홈 등에서 카테고리 그리드로 쓸 때 (주 사용처는 좌측 햄버거 메뉴) */
export default function CategoryGrid() {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">카테고리</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {BOOK_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/books?category=${encodeURIComponent(c.slug)}`}
            className="flex items-center justify-center min-h-[48px] rounded-lg border border-border bg-card font-medium hover:bg-accent"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

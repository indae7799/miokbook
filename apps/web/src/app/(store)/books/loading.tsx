/** 도서 목록 로딩 — 카테고리 전환 시 즉시 표시 */
export default function BooksLoading() {
  return (
    <main className="min-h-screen pb-10 max-w-[1200px] mx-auto px-4">
      <div className="mb-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-11 w-80 bg-muted rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 w-16 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
        <div className="flex gap-1 border-b border-border">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-20 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[1200px]:grid-cols-6 gap-[19px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card overflow-hidden animate-pulse">
            <div className="aspect-[188/254] bg-muted" />
            <div className="p-2 space-y-2">
              <div className="h-3 bg-muted rounded w-4/5" />
              <div className="h-2 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

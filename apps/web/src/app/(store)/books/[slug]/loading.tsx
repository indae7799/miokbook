/** 도서 상세 페이지 전용 로딩 — 그리드 대신 상세 레이아웃 스켈레톤 */
export default function BookDetailLoading() {
  return (
    <main className="min-h-screen py-6">
      <div className="max-w-[1000px] mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-6">
          {/* 표지 스켈레톤 */}
          <div className="relative aspect-[188/254] w-full max-w-[188px] shrink-0 rounded-lg overflow-hidden bg-muted animate-pulse" />
          {/* 우측 정보 스켈레톤 */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
            <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-6 bg-muted rounded w-24 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 bg-muted rounded w-24 animate-pulse" />
              <div className="h-10 bg-muted rounded w-24 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

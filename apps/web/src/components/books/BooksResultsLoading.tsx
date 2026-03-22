import { Loader2 } from 'lucide-react';

/** 도서 목록 fetch 중 — 스켈레톤 대신 저자극 스피너 */
export default function BooksResultsLoading() {
  return (
    <div
      className="flex min-h-[min(70vh,520px)] flex-col items-center justify-center gap-3 rounded-lg border border-border/50 bg-background px-6 py-16"
      role="status"
      aria-live="polite"
      aria-label="검색 결과 로딩 중"
    >
      <Loader2 className="size-9 animate-spin text-muted-foreground/70" strokeWidth={1.75} />
      <p className="text-sm text-muted-foreground">목록을 불러오는 중…</p>
    </div>
  );
}

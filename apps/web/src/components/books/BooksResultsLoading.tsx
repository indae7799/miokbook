import { Loader2 } from 'lucide-react';

export default function BooksResultsLoading() {
  return (
    <div className="flex min-h-[min(70vh,520px)] flex-col items-center justify-center gap-3 px-6 py-16" role="status" aria-live="polite" aria-label="검색 결과 로딩 중">
      <Loader2 className="size-9 animate-spin text-muted-foreground/75" strokeWidth={1.75} />
      <p className="text-sm text-muted-foreground">로딩중입니다.</p>
    </div>
  );
}

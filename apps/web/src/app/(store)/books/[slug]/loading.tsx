import { LoaderCircle } from 'lucide-react';

export default function BookDetailLoading() {
  return (
    <main className="min-h-screen py-6">
      <div className="mx-auto flex min-h-[min(70vh,520px)] max-w-[1000px] flex-col items-center justify-center gap-3 px-4">
        <LoaderCircle
          className="size-10 animate-spin text-muted-foreground/80"
          strokeWidth={1.75}
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">도서 정보를 불러오는 중…</p>
      </div>
    </main>
  );
}

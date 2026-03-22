import BooksResultsLoading from '@/components/books/BooksResultsLoading';

/** 도서 목록 초기 로드 — 스켈레톤 대신 스피너 */
export default function BooksLoading() {
  return (
    <main className="min-h-screen pt-6 pb-10 max-w-[1200px] mx-auto px-4">
      <h1 className="mb-6 text-2xl font-bold shrink-0">도서 검색</h1>
      <BooksResultsLoading />
    </main>
  );
}

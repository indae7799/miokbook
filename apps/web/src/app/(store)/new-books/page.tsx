import NewBooksPageClient from './NewBooksPageClient';
import { getNewBooksForListing } from '@/lib/store/book-list-pages';

export const revalidate = 120;

export const metadata = {
  title: '신간 도서',
  description: '미옥서원에 최근 등록된 신간 도서를 카테고리와 페이지 단위로 둘러보세요.',
  alternates: { canonical: '/new-books' },
};

export default async function NewBooksPage() {
  const books = await getNewBooksForListing();
  return <NewBooksPageClient books={books} />;
}

import BestsellersPageClient from './BestsellersPageClient';
import { getBestsellersForListing } from '@/lib/store/book-list-pages';

export const revalidate = 120;

export const metadata = {
  title: '베스트셀러 | 미옥서원',
  description: '미옥서원의 베스트셀러 도서를 확인해 보세요.',
};

export default async function BestsellersPage() {
  const books = await getBestsellersForListing();

  return <BestsellersPageClient books={books} />;
}

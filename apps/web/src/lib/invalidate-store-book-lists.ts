import { revalidatePath, revalidateTag } from 'next/cache';
import { BOOK_LISTINGS_CACHE_TAG, CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';

/** 주문·재고·도서 변경 시 스토어 홈·목록 캐시 무효화 */
export function invalidateStoreBookListsAndHome(): void {
  revalidateTag(CMS_HOME_CACHE_TAG);
  revalidateTag(BOOK_LISTINGS_CACHE_TAG);
  revalidatePath('/', 'page');
  revalidatePath('/books', 'page');
  revalidatePath('/bestsellers', 'page');
  revalidatePath('/new-books', 'page');
}

export function invalidateStoreBookDetailPaths(isbn: string, slug?: string | null): void {
  revalidatePath(`/books/${isbn}`, 'page');
  revalidatePath(`/api/books/${isbn}`);
  if (slug) {
    revalidatePath(`/books/${slug}`, 'page');
  }
}

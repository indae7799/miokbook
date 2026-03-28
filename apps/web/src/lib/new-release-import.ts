import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { isBlockedAutoImportTarget } from '@/lib/auto-import-policy';
import { normalizeExternalCoverUrl, persistExternalCoverImage } from '@/lib/book-cover-storage';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { getMeilisearchServer } from '@/lib/meilisearch';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ALADIN_ITEM_LIST = 'https://www.aladin.co.kr/ttb/api/ItemList.aspx';
const NEW_RELEASE_PAGES = 4;
const PAGE_SIZE = 50;
const DEFAULT_NEW_RELEASE_STOCK = Math.max(0, Number(process.env.NEW_RELEASE_IMPORT_STOCK ?? 5) || 5);

interface AladinListItem {
  title?: string;
  author?: string;
  publisher?: string;
  description?: string;
  cover?: string;
  priceStandard?: number;
  priceSales?: number;
  pubDate?: string;
  categoryName?: string;
  itemStatus?: string;
  isbn13?: string;
}

type BookStatus = 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition';

const ITEM_STATUS_MAP: Record<string, BookStatus> = {
  정상판매: 'on_sale',
  품절: 'out_of_print',
  절판: 'out_of_print',
  예약판매중: 'coming_soon',
  구판: 'old_edition',
};

function mapItemStatus(value: string | undefined): BookStatus {
  if (!value) return 'on_sale';
  return ITEM_STATUS_MAP[value.trim()] ?? 'on_sale';
}

function slugify(title: string): string {
  return (
    title
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w가-힣-]/g, '')
      .toLowerCase() || 'book'
  );
}

function cleanAuthor(raw: string | undefined): string {
  if (!raw) return '';
  const first = raw.split(/[,;]/)[0] ?? '';
  return first
    .replace(/\s*[\(\[].*?[\)\]]/g, '')
    .replace(/\s*(지은이|저자|엮음|그림|사진|옮긴이|감수|글)\s*/g, '')
    .trim();
}

function toEpoch(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

async function fetchPage(ttbKey: string, start: number): Promise<AladinListItem[]> {
  const url =
    `${ALADIN_ITEM_LIST}?ttbkey=${encodeURIComponent(ttbKey)}` +
    `&QueryType=ItemNewAll&MaxResults=${PAGE_SIZE}&start=${start}` +
    '&SearchTarget=Book&output=js&Version=20131101';

  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`ALADIN_HTTP_${res.status}`);
  const text = await res.text();
  const data = JSON.parse(text.replace(/;\s*$/, '')) as { item?: AladinListItem[] };
  return data.item ?? [];
}

function isImportTarget(item: AladinListItem): boolean {
  const category = mapAladinCategoryToSlug(item.categoryName);
  const status = mapItemStatus(item.itemStatus);
  return Boolean(
    item.isbn13 &&
      category !== '기타' &&
      status === 'on_sale' &&
      !isBlockedAutoImportTarget({
        categoryName: item.categoryName,
        itemStatus: item.itemStatus,
      }),
  );
}

export interface NewReleaseImportResult {
  fetched: number;
  candidates: number;
  inserted: number;
  skippedExisting: number;
  skippedFiltered: number;
  errors: string[];
}

export async function importNewReleaseBooks(): Promise<NewReleaseImportResult> {
  if (!supabaseAdmin) throw new Error('SUPABASE_UNAVAILABLE');
  const ttbKey = process.env.ALADIN_TTB_KEY?.trim();
  if (!ttbKey) throw new Error('ALADIN_TTB_KEY missing');

  const pages = await Promise.all(
    Array.from({ length: NEW_RELEASE_PAGES }, (_, index) => fetchPage(ttbKey, index * PAGE_SIZE + 1)),
  );
  const fetchedItems = pages.flat();
  const uniqueByIsbn = new Map<string, AladinListItem>();
  let skippedFiltered = 0;

  for (const item of fetchedItems) {
    const isbn = String(item.isbn13 ?? '').trim();
    if (!isbn || uniqueByIsbn.has(isbn)) continue;
    if (!isImportTarget(item)) {
      skippedFiltered += 1;
      continue;
    }
    uniqueByIsbn.set(isbn, item);
  }

  const candidates = Array.from(uniqueByIsbn.values());
  const isbnList = candidates.map((item) => String(item.isbn13!).trim());
  const { data: existingBooks, error: existingBooksError } = await supabaseAdmin
    .from('books')
    .select('isbn')
    .in('isbn', isbnList);
  if (existingBooksError) throw new Error(existingBooksError.message);

  const existingSet = new Set((existingBooks ?? []).map((row) => row.isbn));
  const newItems = candidates.filter((item) => !existingSet.has(String(item.isbn13!)));
  const nowIso = new Date().toISOString();
  const insertedBooks: Array<{
    isbn: string;
    slug: string;
    title: string;
    author: string;
    publisher: string;
    description: string;
    cover_image: string;
    list_price: number;
    sale_price: number;
    category: string;
    status: BookStatus;
    is_active: boolean;
    rating: number;
    review_count: number;
    sales_count: number;
    publish_date: string | null;
    created_at: string;
    updated_at: string;
    synced_at: null;
  }> = [];
  const errors: string[] = [];

  for (const item of newItems) {
    const isbn = String(item.isbn13!).trim();
    try {
      const title = String(item.title ?? '').trim();
      if (!title) continue;
      const listPrice = Math.max(0, Number(item.priceStandard ?? 0));
      const salePrice = Math.max(0, Number(item.priceSales ?? listPrice));
      const coverImage = await persistExternalCoverImage(
        isbn,
        normalizeExternalCoverUrl(String(item.cover ?? '')),
      );
      const publishDate =
        item.pubDate && !Number.isNaN(new Date(item.pubDate).getTime())
          ? new Date(item.pubDate).toISOString()
          : null;

      const bookData = {
        isbn,
        slug: `${slugify(title)}-${isbn}`,
        title,
        author: cleanAuthor(item.author),
        publisher: String(item.publisher ?? '').trim(),
        description: String(item.description ?? '').trim(),
        cover_image: coverImage,
        list_price: listPrice,
        sale_price: salePrice,
        category: mapAladinCategoryToSlug(item.categoryName),
        status: 'on_sale' as const,
        is_active: true,
        rating: 0,
        review_count: 0,
        sales_count: 0,
        publish_date: publishDate,
        created_at: nowIso,
        updated_at: nowIso,
        synced_at: null,
      };

      const { error: insertBookError } = await supabaseAdmin.from('books').insert(bookData);
      if (insertBookError) {
        errors.push(`${isbn}: ${insertBookError.message}`);
        continue;
      }

      const { error: inventoryError } = await supabaseAdmin.from('inventory').upsert(
        {
          isbn,
          stock: DEFAULT_NEW_RELEASE_STOCK,
          reserved: 0,
          updated_at: nowIso,
        },
        { onConflict: 'isbn' },
      );
      if (inventoryError) {
        errors.push(`${isbn}: ${inventoryError.message}`);
        continue;
      }

      insertedBooks.push(bookData);
    } catch (error) {
      errors.push(`${isbn}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (insertedBooks.length > 0) {
    const client = getMeilisearchServer();
    if (client) {
      try {
        const index = client.index('books');
        const task = await index.addDocuments(
          insertedBooks.map((book) => ({
            isbn: book.isbn,
            slug: book.slug,
            title: book.title,
            titleNormalized: book.title.replace(/\s+/g, ''),
            author: book.author,
            publisher: book.publisher,
            description: book.description,
            coverImage: book.cover_image,
            listPrice: book.list_price,
            salePrice: book.sale_price,
            category: book.category,
            status: book.status,
            isActive: book.is_active,
            publishDate: toEpoch(book.publish_date),
            rating: book.rating,
            reviewCount: book.review_count,
            salesCount: book.sales_count,
            createdAt: toEpoch(book.created_at),
            updatedAt: toEpoch(book.updated_at),
            id: book.isbn,
          })),
        );
        const done = await index.waitForTask(task.taskUid);
        if (done.status === 'succeeded') {
          await supabaseAdmin
            .from('books')
            .update({ synced_at: new Date().toISOString() })
            .in('isbn', insertedBooks.map((book) => book.isbn));
        }
      } catch (error) {
        errors.push(`meilisearch: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    invalidateStoreBookListsAndHome();
  }

  return {
    fetched: fetchedItems.length,
    candidates: candidates.length,
    inserted: insertedBooks.length,
    skippedExisting: candidates.length - newItems.length,
    skippedFiltered,
    errors,
  };
}

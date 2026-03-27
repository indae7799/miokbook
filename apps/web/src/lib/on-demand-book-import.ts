import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { isBlockedAutoImportTarget } from '@/lib/auto-import-policy';
import { normalizeExternalCoverUrl, persistExternalCoverImage } from '@/lib/book-cover-storage';
import { invalidate } from '@/lib/firestore-cache';
import { invalidateStoreBookDetailPaths, invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { getMeilisearchServer } from '@/lib/meilisearch';
import { invalidateBookDetailCaches } from '@/lib/store/bookDetail';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ISBN13_REGEX = /^97[89]\d{10}$/;
const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const DEFAULT_AUTO_IMPORTED_STOCK = Math.max(0, Number(process.env.AUTO_IMPORTED_BOOK_STOCK ?? 999) || 999);

type BookStatus = 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition';

interface AladinItem {
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
}

const ITEM_STATUS_MAP: Record<string, BookStatus> = {
  정상판매: 'on_sale',
  품절: 'out_of_print',
  절판: 'out_of_print',
  예약판매중: 'coming_soon',
  구판: 'old_edition',
};

function slugify(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣-]/g, '')
    .toLowerCase() || 'book';
}

function cleanAuthor(raw: string | undefined): string {
  if (!raw) return '';
  const first = raw.split(/[,;]/)[0] ?? '';
  return first
    .replace(/\s*[\(\[].*?[\)\]]/g, '')
    .replace(/\s*(지은이|지음|옮김|그림|사진|엮음|감수|글)\s*/g, '')
    .trim();
}

function mapItemStatus(value: string | undefined): BookStatus {
  if (!value) return 'on_sale';
  return ITEM_STATUS_MAP[value.trim()] ?? 'on_sale';
}

function toEpoch(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

async function fetchAladinItemOnce(isbn: string, ttbKey: string, cover: string): Promise<AladinItem | null> {
  const url =
    `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}` +
    `&itemIdType=ISBN13&ItemId=${encodeURIComponent(isbn)}` +
    `&output=js&Version=20131101&Cover=${cover}&OptResult=subInfo`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    const cleaned = text.replace(/;\s*$/, '').trim();
    const data = JSON.parse(cleaned) as { item?: AladinItem[]; errorCode?: number };
    if (data.errorCode || !data.item?.length) return null;
    return data.item[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchAladinItem(isbn: string, ttbKey: string): Promise<AladinItem | null> {
  const item = await fetchAladinItemOnce(isbn, ttbKey, 'Big');
  if (!item) return null;
  if (!item.cover?.trim()) {
    const retry = await fetchAladinItemOnce(isbn, ttbKey, 'MidBig');
    if (retry?.cover?.trim()) return retry;
  }
  return item;
}

async function syncBookToMeilisearch(book: {
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
}) {
  const client = getMeilisearchServer();
  if (!client) return;

  try {
    const index = client.index('books');
    const task = await index.addDocuments([
      {
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
      },
    ]);
    const done = await index.waitForTask(task.taskUid);
    if (done.status === 'succeeded') {
      await supabaseAdmin.from('books').update({ synced_at: new Date().toISOString() }).eq('isbn', book.isbn);
    }
  } catch (error) {
    console.error('[on-demand-book-import] Meilisearch sync failed', error);
  }
}

function invalidateImportedBookCaches(isbn: string, slug?: string | null): void {
  invalidate('book', `book:${isbn}`);
  invalidateBookDetailCaches(isbn, slug);
  invalidateStoreBookDetailPaths(isbn, slug);
}

export async function ensureBookByIsbnOnDemand(isbn: string): Promise<{ slug: string; created: boolean } | null> {
  if (!ISBN13_REGEX.test(isbn)) {
    console.warn('[on-demand-book-import] invalid isbn', { isbn });
    return null;
  }
  if (!supabaseAdmin) {
    console.error('[on-demand-book-import] supabase admin unavailable');
    return null;
  }

  const { data: existingBook } = await supabaseAdmin
    .from('books')
    .select('isbn, slug')
    .eq('isbn', isbn)
    .maybeSingle();

  if (existingBook?.slug) {
    invalidateImportedBookCaches(isbn, String(existingBook.slug));
    return { slug: String(existingBook.slug), created: false };
  }

  const ttbKey = process.env.ALADIN_TTB_KEY;
  if (!ttbKey) {
    console.error('[on-demand-book-import] ALADIN_TTB_KEY missing');
    return null;
  }

  const item = await fetchAladinItem(isbn, ttbKey);
  if (!item) {
    console.warn('[on-demand-book-import] aladin item lookup returned null', { isbn });
    return null;
  }
  if (isBlockedAutoImportTarget({ categoryName: item.categoryName, itemStatus: item.itemStatus })) {
    console.warn('[on-demand-book-import] blocked by auto-import policy', {
      isbn,
      categoryName: item.categoryName ?? '',
      itemStatus: item.itemStatus ?? '',
    });
    return null;
  }

  const nowIso = new Date().toISOString();
  const title = String(item.title ?? '').trim();
  if (!title) {
    console.warn('[on-demand-book-import] empty title from aladin item', { isbn });
    return null;
  }

  const publishDate =
    item.pubDate && !Number.isNaN(new Date(item.pubDate).getTime())
      ? new Date(item.pubDate).toISOString()
      : null;

  const listPrice = Math.max(0, Number(item.priceStandard ?? 0));
  const apiSalePrice = Math.max(0, Number(item.priceSales ?? 0));
  const salePrice = apiSalePrice > 0 ? apiSalePrice : listPrice;
  const slug = `${slugify(title)}-${isbn}`;
  const coverImage = await persistExternalCoverImage(isbn, normalizeExternalCoverUrl(String(item.cover ?? '')));

  const bookData = {
    isbn,
    slug,
    title,
    author: cleanAuthor(item.author),
    publisher: String(item.publisher ?? '').trim(),
    description: String(item.description ?? '').trim(),
    cover_image: coverImage,
    list_price: listPrice,
    sale_price: salePrice,
    category: mapAladinCategoryToSlug(item.categoryName),
    status: mapItemStatus(item.itemStatus),
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
    const { data: raceWinner } = await supabaseAdmin
      .from('books')
      .select('isbn, slug')
      .eq('isbn', isbn)
      .maybeSingle();
    if (raceWinner?.slug) {
      invalidateImportedBookCaches(isbn, String(raceWinner.slug));
      return { slug: String(raceWinner.slug), created: false };
    }
    console.error('[on-demand-book-import] insert book failed', insertBookError);
    return null;
  }

  const { data: existingInventory } = await supabaseAdmin
    .from('inventory')
    .select('stock, reserved')
    .eq('isbn', isbn)
    .maybeSingle();

  const { error: inventoryError } = await supabaseAdmin.from('inventory').upsert(
    {
      isbn,
      stock: Math.max(Number(existingInventory?.stock ?? 0), DEFAULT_AUTO_IMPORTED_STOCK),
      reserved: Number(existingInventory?.reserved ?? 0),
      updated_at: nowIso,
    },
    { onConflict: 'isbn' },
  );

  if (inventoryError) {
    console.error('[on-demand-book-import] upsert inventory failed', inventoryError);
  }

  await syncBookToMeilisearch(bookData);
  invalidateImportedBookCaches(isbn, slug);
  invalidateStoreBookListsAndHome();

  return { slug, created: true };
}

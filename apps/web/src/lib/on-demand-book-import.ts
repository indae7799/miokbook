import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { isBlockedAutoImportTarget } from '@/lib/auto-import-policy';
import { normalizeExternalCoverUrl, persistExternalCoverImage } from '@/lib/book-cover-storage';
import { invalidate } from '@/lib/firestore-cache';
import { invalidateStoreBookDetailPaths, invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { getSiteOrigin } from '@/lib/site-origin';
import { markBookAsRecentlyImported } from '@/lib/recent-import-priority';
import { invalidateBookDetailCaches } from '@/lib/store/bookDetail';
import { invalidateBookSearchCache } from '@/lib/store/search';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ISBN13_REGEX = /^97[89]\d{10}$/;
const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const DEFAULT_AUTO_IMPORTED_STOCK = Math.max(0, Number(process.env.AUTO_IMPORTED_BOOK_STOCK ?? 999) || 999);

type BookStatus = 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition';

export interface ExternalBookDetailPreview {
  book: {
    isbn: string;
    slug: string;
    title: string;
    author: string;
    publisher: string;
    description: string;
    coverImage: string;
    listPrice: number;
    salePrice: number;
    category: string;
    status: BookStatus;
    publishDate?: string;
  };
  available: number;
  recommended: [];
  externalPreview: true;
}

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

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

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

function buildPreviewPayload(isbn: string, item: AladinItem): ExternalBookDetailPreview | null {
  const title = String(item.title ?? '').trim();
  if (!title) return null;

  const publishDate =
    item.pubDate && !Number.isNaN(new Date(item.pubDate).getTime())
      ? new Date(item.pubDate).toISOString()
      : undefined;

  const listPrice = Math.max(0, Number(item.priceStandard ?? 0));
  const apiSalePrice = Math.max(0, Number(item.priceSales ?? 0));
  const salePrice = apiSalePrice > 0 ? apiSalePrice : listPrice;

  return {
    book: {
      isbn,
      slug: isbn,
      title,
      author: cleanAuthor(item.author),
      publisher: String(item.publisher ?? '').trim(),
      description: String(item.description ?? '').trim(),
      coverImage: normalizeExternalCoverUrl(String(item.cover ?? '')),
      listPrice,
      salePrice,
      category: mapAladinCategoryToSlug(item.categoryName),
      status: mapItemStatus(item.itemStatus),
      publishDate,
    },
    available: 0,
    recommended: [],
    externalPreview: true,
  };
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

function invalidateImportedBookCaches(isbn: string, slug?: string | null): void {
  invalidate('book', `book:${isbn}`);
  invalidateBookDetailCaches(isbn, slug);
  invalidateStoreBookDetailPaths(isbn, slug);
}

async function revalidateStoreListingsAfterImport(): Promise<void> {
  try {
    invalidateStoreBookListsAndHome();
    return;
  } catch (error) {
    console.warn('[on-demand-book-import] direct store revalidation failed', error);
  }

  const secret = process.env.INTERNAL_REVALIDATE_SECRET?.trim();
  if (!secret) return;

  try {
    const response = await fetch(`${getSiteOrigin()}/api/internal/revalidate-store-lists`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secret}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.warn('[on-demand-book-import] internal revalidate route failed', { status: response.status });
    }
  } catch (error) {
    console.warn('[on-demand-book-import] internal revalidate route error', error);
  }
}

async function finalizeImportedBookAssetsAndSearch(
  isbn: string,
  nowIso: string,
  bookData: {
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
  },
  coverSourceUrl: string,
): Promise<void> {
  const finalizeStartedAt = Date.now();
  try {
    const coverStartedAt = Date.now();
    const storedCoverImage = await persistExternalCoverImage(isbn, coverSourceUrl);
    console.info('[on-demand-book-import] cover persistence finished', {
      isbn,
      elapsedMs: elapsedMs(coverStartedAt),
      totalElapsedMs: elapsedMs(finalizeStartedAt),
      changed: !!storedCoverImage && storedCoverImage !== bookData.cover_image,
    });
    if (storedCoverImage && storedCoverImage !== bookData.cover_image) {
      const { error } = await supabaseAdmin
        .from('books')
        .update({
          cover_image: storedCoverImage,
          updated_at: nowIso,
          synced_at: null,
        })
        .eq('isbn', isbn);

      if (error) {
        console.error('[on-demand-book-import] cover image update failed', error);
      } else {
        bookData.cover_image = storedCoverImage;
      }
    }
    console.info('[on-demand-book-import] finalization finished', {
      isbn,
      totalElapsedMs: elapsedMs(finalizeStartedAt),
    });
  } catch (error) {
    console.error('[on-demand-book-import] finalize imported book failed', error);
  }
}

function scheduleImportedBookFinalization(
  isbn: string,
  nowIso: string,
  bookData: {
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
  },
  coverSourceUrl: string,
): void {
  queueMicrotask(() => {
    void finalizeImportedBookAssetsAndSearch(isbn, nowIso, bookData, coverSourceUrl);
  });
}

async function fetchAladinPreviewCandidate(isbn: string): Promise<ExternalBookDetailPreview | null> {
  if (!ISBN13_REGEX.test(isbn)) {
    console.warn('[on-demand-book-import] invalid isbn', { isbn });
    return null;
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

  if (isBlockedAutoImportTarget({ categoryName: item.categoryName, itemStatus: undefined })) {
    console.warn('[on-demand-book-import] blocked by category policy', {
      isbn,
      categoryName: item.categoryName ?? '',
    });
    return null;
  }

  return buildPreviewPayload(isbn, item);
}

export async function getExternalBookDetailPreview(isbn: string): Promise<ExternalBookDetailPreview | null> {
  const preview = await fetchAladinPreviewCandidate(isbn);
  if (!preview) return null;
  return preview.book.status === 'on_sale' ? null : preview;
}

export async function ensureBookByIsbnOnDemand(isbn: string): Promise<{ slug: string; created: boolean } | null> {
  const requestStartedAt = Date.now();
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
    console.info('[on-demand-book-import] existing book hit', {
      isbn,
      slug: String(existingBook.slug),
      elapsedMs: elapsedMs(requestStartedAt),
    });
    return { slug: String(existingBook.slug), created: false };
  }

  const previewStartedAt = Date.now();
  const preview = await fetchAladinPreviewCandidate(isbn);
  console.info('[on-demand-book-import] preview fetched', {
    isbn,
    elapsedMs: elapsedMs(previewStartedAt),
    totalElapsedMs: elapsedMs(requestStartedAt),
    found: !!preview,
  });
  if (!preview) return null;

  const item = {
    title: preview.book.title,
    author: preview.book.author,
    publisher: preview.book.publisher,
    description: preview.book.description,
    cover: preview.book.coverImage,
    priceStandard: preview.book.listPrice,
    priceSales: preview.book.salePrice,
    pubDate: preview.book.publishDate,
    categoryName: preview.book.category,
    itemStatus: preview.book.status,
  } satisfies AladinItem;

  const nowIso = new Date().toISOString();
  const title = String(preview.book.title ?? '').trim();
  if (!title) {
    console.warn('[on-demand-book-import] empty title from aladin item', { isbn });
    return null;
  }

  const publishDate = preview.book.publishDate ?? null;
  const listPrice = preview.book.listPrice;
  const salePrice = preview.book.salePrice;
  const slug = `${slugify(title)}-${isbn}`;
  const coverImage = normalizeExternalCoverUrl(preview.book.coverImage);
  const mappedStatus = preview.book.status;

  if (mappedStatus !== 'on_sale') {
    console.warn('[on-demand-book-import] blocked by item status', {
      isbn,
      itemStatus: item.itemStatus ?? '',
      mappedStatus,
    });
    return null;
  }

  const bookData = {
    isbn,
    slug,
    title,
    author: preview.book.author,
    publisher: preview.book.publisher,
    description: preview.book.description,
    cover_image: coverImage,
    list_price: listPrice,
    sale_price: salePrice,
    category: preview.book.category,
    status: mappedStatus,
    is_active: true,
    rating: 0,
    review_count: 0,
    sales_count: 0,
    publish_date: publishDate,
    created_at: nowIso,
    updated_at: nowIso,
    synced_at: null,
  };

  const insertStartedAt = Date.now();
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
  console.info('[on-demand-book-import] book inserted', {
    isbn,
    slug,
    elapsedMs: elapsedMs(insertStartedAt),
    totalElapsedMs: elapsedMs(requestStartedAt),
  });
  markBookAsRecentlyImported(isbn, Date.parse(nowIso));

  const inventoryStartedAt = Date.now();
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
  console.info('[on-demand-book-import] inventory upsert finished', {
    isbn,
    elapsedMs: elapsedMs(inventoryStartedAt),
    totalElapsedMs: elapsedMs(requestStartedAt),
    hasError: !!inventoryError,
  });

  const revalidateStartedAt = Date.now();
  invalidateImportedBookCaches(isbn, slug);
  invalidateBookSearchCache();
  await revalidateStoreListingsAfterImport();
  console.info('[on-demand-book-import] cache revalidation finished', {
    isbn,
    elapsedMs: elapsedMs(revalidateStartedAt),
    totalElapsedMs: elapsedMs(requestStartedAt),
  });
  scheduleImportedBookFinalization(isbn, nowIso, bookData, preview.book.coverImage);
  console.info('[on-demand-book-import] request finished', {
    isbn,
    slug,
    totalElapsedMs: elapsedMs(requestStartedAt),
  });

  return { slug, created: true };
}

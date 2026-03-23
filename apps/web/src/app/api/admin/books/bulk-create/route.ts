import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';
import { getMeilisearchServer } from '@/lib/meilisearch';

export const dynamic = 'force-dynamic';

const ISBN13_REGEX = /^(978|979)\d{10}$/;
const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

function normalizeIsbn(value: unknown): string {
  let s = String(value ?? '').trim().replace(/\.0+$/, '');
  if (/[eE][+\-]?\d/.test(s)) {
    const num = Number(s);
    if (!Number.isNaN(num) && Number.isFinite(num)) s = num.toFixed(0);
  }
  const digits = s.replace(/\D/g, '');
  return digits.length >= 13 ? digits.slice(0, 13) : digits;
}

function toValidIsbn(raw: string): string {
  const direct = String(raw).trim();
  if (ISBN13_REGEX.test(direct)) return direct;
  const normalized = normalizeIsbn(direct);
  return ISBN13_REGEX.test(normalized) ? normalized : '';
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
    .replace(/\s*(지은이|지음|옮김|그림|사진|엮음|감수|글)\s*/g, '')
    .trim();
}

const ITEM_STATUS_MAP: Record<string, 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition'> = {
  정상판매: 'on_sale',
  절판: 'out_of_print',
  품절: 'out_of_print',
  예약판매중: 'coming_soon',
  구판: 'old_edition',
};

function mapItemStatus(value: string | undefined): 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition' {
  if (!value) return 'on_sale';
  return ITEM_STATUS_MAP[value.trim()] ?? 'on_sale';
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

interface BulkCreatePayload {
  items: Array<{ isbn: string; stock: number }>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    await sleep(400);
    const retry = await fetchAladinItemOnce(isbn, ttbKey, 'MidBig');
    if (retry?.cover?.trim()) return retry;
  }
  return item;
}

function normalizeCoverUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (s.startsWith('//')) return `https:${s}`;
  if (!s.startsWith('http')) return '';
  return s;
}

function toEpoch(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export async function POST(request: Request) {
  try {
    if (!adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const idToken = request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7)
      : null;
    if (!idToken) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as BulkCreatePayload | null;
    const rawItems = body?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'ISBN list is empty.' }, { status: 400 });
    }
    if (rawItems.length > 500) {
      return NextResponse.json({ error: 'Max 500 items per request.' }, { status: 400 });
    }

    const ttbKey = process.env.ALADIN_TTB_KEY;
    if (!ttbKey) {
      return NextResponse.json({ error: 'ALADIN_TTB_KEY missing' }, { status: 500 });
    }

    const validItems: Array<{ isbn: string; stock: number }> = [];
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const row of rawItems) {
      const isbn = toValidIsbn(String(row?.isbn ?? ''));
      if (!isbn) {
        results.failed++;
        results.errors.push(`${row?.isbn}: invalid ISBN-13`);
        continue;
      }
      const stock = Math.max(0, Number(row?.stock) || 0);
      validItems.push({ isbn, stock });
    }

    if (validItems.length === 0) {
      return NextResponse.json({ ...results, message: 'No valid ISBNs.' });
    }

    const nowIso = new Date().toISOString();
    const isbns = validItems.map((item) => item.isbn);

    const [{ data: existingBooks }, { data: existingInventory }] = await Promise.all([
      supabaseAdmin.from('books').select('isbn').in('isbn', isbns),
      supabaseAdmin.from('inventory').select('isbn, stock, reserved').in('isbn', isbns),
    ]);

    const existingBookSet = new Set((existingBooks ?? []).map((book) => book.isbn));
    const inventoryMap = new Map((existingInventory ?? []).map((item) => [item.isbn, item]));

    const existingToUpdate = validItems.filter((item) => existingBookSet.has(item.isbn));
    const newToCreate = validItems.filter((item) => !existingBookSet.has(item.isbn));

    if (existingToUpdate.length > 0) {
      const inventoryUpserts = existingToUpdate.map((item) => {
        const current = inventoryMap.get(item.isbn);
        return {
          isbn: item.isbn,
          stock: Number(current?.stock ?? 0) + item.stock,
          reserved: Number(current?.reserved ?? 0),
          updated_at: nowIso,
        };
      });

      const { error: invError } = await supabaseAdmin
        .from('inventory')
        .upsert(inventoryUpserts, { onConflict: 'isbn' });

      if (invError) {
        return NextResponse.json({ error: invError.message }, { status: 500 });
      }

      const { error: bookUpdateError } = await supabaseAdmin
        .from('books')
        .update({ updated_at: nowIso })
        .in('isbn', existingToUpdate.map((item) => item.isbn));

      if (bookUpdateError) {
        return NextResponse.json({ error: bookUpdateError.message }, { status: 500 });
      }

      results.success += existingToUpdate.length;
    }

    const savedBooks: Array<{
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
      status: 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition';
      is_active: boolean;
      rating: number;
      review_count: number;
      sales_count: number;
      publish_date: string | null;
      created_at: string;
      updated_at: string;
      synced_at: string | null;
    }> = [];

    for (let i = 0; i < newToCreate.length; i++) {
      const { isbn, stock } = newToCreate[i]!;
      if (i > 0) await sleep(300);

      const aladinItem = await fetchAladinItem(isbn, ttbKey);
      if (!aladinItem) {
        results.failed++;
        results.errors.push(`${isbn}: not found in Aladin`);
        continue;
      }

      try {
        const title = (aladinItem.title ?? '').trim();
        const author = cleanAuthor(aladinItem.author);
        const publisher = (aladinItem.publisher ?? '').trim();
        const description = (aladinItem.description ?? '').trim();
        const listPrice = Math.max(0, Number(aladinItem.priceStandard) || 0);
        const salePrice = listPrice > 0 ? Math.floor(listPrice * 0.9) : 0;
        const coverImage = normalizeCoverUrl(aladinItem.cover ?? '');
        const category = mapAladinCategoryToSlug(aladinItem.categoryName);
        const status = mapItemStatus(aladinItem.itemStatus);
        const slug = `${slugify(title)}-${isbn}`;

        let publishDate: string | null = null;
        if (aladinItem.pubDate) {
          const parsed = new Date(aladinItem.pubDate);
          if (!Number.isNaN(parsed.getTime())) publishDate = parsed.toISOString();
        }

        const bookData = {
          isbn,
          slug,
          title,
          author,
          publisher,
          description,
          cover_image: coverImage,
          list_price: listPrice,
          sale_price: salePrice,
          category,
          status,
          is_active: true,
          rating: 0,
          review_count: 0,
          sales_count: 0,
          publish_date: publishDate,
          created_at: nowIso,
          updated_at: nowIso,
          synced_at: null,
        };

        const { error: insertBookError } = await supabaseAdmin
          .from('books')
          .insert(bookData);

        if (insertBookError) {
          results.failed++;
          results.errors.push(`${isbn}: ${insertBookError.message}`);
          continue;
        }

        const { error: insertInventoryError } = await supabaseAdmin
          .from('inventory')
          .upsert(
            {
              isbn,
              stock,
              reserved: 0,
              updated_at: nowIso,
            },
            { onConflict: 'isbn' }
          );

        if (insertInventoryError) {
          results.failed++;
          results.errors.push(`${isbn}: ${insertInventoryError.message}`);
          continue;
        }

        savedBooks.push(bookData);
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(`${isbn}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (savedBooks.length > 0) {
      const client = getMeilisearchServer();
      if (client) {
        try {
          const index = client.index('books');
          const meiliDocs = savedBooks.map((book) => ({
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
          }));

          const task = await index.addDocuments(meiliDocs);
          const done = await index.waitForTask(task.taskUid);

          if (done.status === 'succeeded') {
            await supabaseAdmin
              .from('books')
              .update({ synced_at: new Date().toISOString() })
              .in('isbn', savedBooks.map((book) => book.isbn));
          } else {
            console.error('[bulk-create] Meilisearch task failed:', done);
          }
        } catch (err) {
          console.error('[bulk-create] Meilisearch sync failed:', err);
        }
      }
    }

    if (results.success > 0) {
      invalidateStoreBookListsAndHome();
    }

    return NextResponse.json({
      success: results.success,
      failed: results.failed,
      errors: results.errors,
      detail: {
        stockAdded: existingToUpdate.length,
        newCreated: savedBooks.length,
      },
    });
  } catch (e) {
    console.error('[bulk-create POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

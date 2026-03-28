import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { getBookCategoryDisplayName } from '@/lib/categories';
import { getMeilisearchServer } from '@/lib/meilisearch';
import { setFallbackBooksToRedis, type FallbackBookRow } from '@/lib/search-fallback-redis';
import { isBlockedAutoImportTarget } from '@/lib/auto-import-policy';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const PAGE_SIZE = 400;
const MEILI_CHUNK = 500;
const WAIT_MS = 240_000;

function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, '');
}

function rowToMeili(row: {
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
  status: string;
  is_active: boolean;
  publish_date: string | null;
  rating: number;
  review_count: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
}) {
  const mappedCategory = mapAladinCategoryToSlug(String(row.category ?? ''));
  const normalizedCategory =
    getBookCategoryDisplayName(String(row.category ?? '').trim()) ||
    (mappedCategory !== '기타' ? mappedCategory : String(row.category ?? '').trim());

  return {
    isbn: row.isbn,
    slug: row.slug ?? '',
    title: row.title ?? '',
    titleNormalized: normalizeTitle(String(row.title ?? '')),
    author: row.author ?? '',
    publisher: row.publisher ?? '',
    description: row.description ?? '',
    coverImage: row.cover_image ?? '',
    listPrice: Number(row.list_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    category: normalizedCategory,
    status: String(row.status ?? ''),
    isActive: Boolean(row.is_active),
    publishDate: row.publish_date ? new Date(row.publish_date).getTime() : null,
    rating: Number(row.rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    salesCount: Number(row.sales_count ?? 0),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : null,
  };
}

function rowToSlim(row: {
  isbn: string;
  slug: string;
  title: string;
  author: string;
  cover_image: string;
  list_price: number;
  sale_price: number;
  category: string;
  status: string;
  rating: number;
}): FallbackBookRow {
  const mappedCategory = mapAladinCategoryToSlug(String(row.category ?? ''));
  const normalizedCategory =
    getBookCategoryDisplayName(String(row.category ?? '').trim()) ||
    (mappedCategory !== '기타' ? mappedCategory : String(row.category ?? '').trim());

  return {
    isbn: row.isbn,
    slug: row.slug ?? '',
    title: row.title ?? '',
    author: row.author ?? '',
    coverImage: row.cover_image ?? '',
    listPrice: Number(row.list_price ?? 0),
    salePrice: Number(row.sale_price ?? 0),
    category: normalizedCategory,
    status: String(row.status ?? ''),
    rating: Number(row.rating ?? 0),
  };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const client = getMeilisearchServer();
    if (!client) {
      return NextResponse.json({ error: 'Meilisearch not configured' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({ force: false }));
    const force = body.force === true;
    const index = client.index('books');

    if (force) {
      await index.deleteAllDocuments();
    }

    await index.updateSearchableAttributes(['titleNormalized', 'title', 'author', 'publisher', 'description', 'isbn']);
    await index.updateFilterableAttributes(['category', 'status', 'isActive', 'syncedAt']);
    await index.updateSortableAttributes(['createdAt', 'salePrice', 'listPrice', 'rating', 'salesCount']);

    const slimRows: FallbackBookRow[] = [];
    let from = 0;
    let lastTaskUid: number | undefined;
    let synced = 0;

    for (;;) {
      let query = supabaseAdmin
        .from('books')
        .select('isbn, slug, title, author, publisher, description, cover_image, list_price, sale_price, category, status, is_active, publish_date, rating, review_count, sales_count, created_at, updated_at, synced_at')
        .eq('is_active', true)
        .order('isbn', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (!force) {
        query = query.is('synced_at', null);
      }

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data || data.length === 0) break;

      const activeRows = data.filter(
        (row) =>
          !isBlockedAutoImportTarget({ categoryName: row.category }) &&
          mapAladinCategoryToSlug(String(row.category ?? '')) !== '기타',
      );
      const meiliDocs = activeRows.map(rowToMeili);
      activeRows.map(rowToSlim).forEach((row) => slimRows.push(row));

      for (let i = 0; i < meiliDocs.length; i += MEILI_CHUNK) {
        const chunk = meiliDocs.slice(i, i + MEILI_CHUNK).map((doc) => ({ ...doc, id: doc.isbn }));
        const task = await index.addDocuments(chunk);
        lastTaskUid = task.taskUid;
        synced += chunk.length;
      }

      const isbns = data.map((row) => row.isbn);
      const { error: updateError } = await supabaseAdmin
        .from('books')
        .update({ synced_at: new Date().toISOString() })
        .in('isbn', isbns);
      if (updateError) {
        console.error('[sync-meilisearch] synced_at update failed', updateError);
      }

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (synced === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No books to sync',
        mode: force ? 'full' : 'incremental',
      });
    }

    if (lastTaskUid !== undefined) {
      const completed = await index.waitForTask(lastTaskUid, {
        timeOutMs: WAIT_MS,
        intervalMs: 400,
      });
      if (completed.status === 'failed') {
        const errMsg = (completed as { error?: { message?: string } }).error?.message ?? 'Index task failed';
        return NextResponse.json({ error: errMsg }, { status: 500 });
      }
    }

    if (force) {
      void setFallbackBooksToRedis(slimRows);
    }

    return NextResponse.json({
      success: true,
      synced,
      count: synced,
      mode: force ? 'full' : 'incremental',
      message: `${synced} synced`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin/books/sync-meilisearch]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

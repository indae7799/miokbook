import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getMeilisearchClient } from '@/lib/meilisearch';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 20;

function isIsbnLike(s: string) {
  return /^\d{10,13}$/.test(s.replace(/-/g, ''));
}

function rowToItem(
  row: {
    isbn: string;
    title?: string | null;
    author?: string | null;
    cover_image?: string | null;
  },
  lite: boolean,
) {
  return {
    isbn: row.isbn,
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    ...(lite ? {} : { coverImage: String(row.cover_image ?? '') }),
  };
}

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const keyword = url.searchParams.get('keyword')?.trim() ?? '';
    const lite = url.searchParams.get('lite') === '1';
    if (!keyword) return NextResponse.json({ items: [] });

    const tokens = keyword
      .split(/[\s,]+/)
      .map((t) => t.replace(/-/g, '').trim())
      .filter(Boolean);
    const isbnTokens = tokens.filter(isIsbnLike);

    if (isbnTokens.length > 0 && isbnTokens.length === tokens.length) {
      const uniqueIsbns = Array.from(new Set(isbnTokens));
      const { data, error } = await supabaseAdmin
        .from('books')
        .select('isbn, title, author, cover_image, is_active')
        .in('isbn', uniqueIsbns);

      if (error) throw error;

      const byIsbn = new Map((data ?? []).map((row) => [row.isbn, row]));
      const items = uniqueIsbns
        .map((isbn) => byIsbn.get(isbn))
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .filter((row) => row.is_active !== false)
        .map((row) => rowToItem(row, lite));

      return NextResponse.json({ items });
    }

    const client = getMeilisearchClient();
    if (client) {
      try {
        const attrs = lite
          ? (['isbn', 'title', 'author'] as const)
          : (['isbn', 'title', 'author', 'coverImage'] as const);
        const res = await client.index('books').search(keyword, {
          filter: 'isActive = true',
          limit: MAX_RESULTS,
          attributesToRetrieve: [...attrs],
        });
        const items = (res.hits as Record<string, unknown>[]).map((hit) => ({
          isbn: String(hit.isbn ?? ''),
          title: String(hit.title ?? ''),
          author: String(hit.author ?? ''),
          ...(lite ? {} : { coverImage: String(hit.coverImage ?? '') }),
        }));
        return NextResponse.json({ items });
      } catch {
        /* fall through */
      }
    }

    const lowered = keyword.toLowerCase();
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('isbn, title, author, cover_image')
      .eq('is_active', true)
      .limit(50);

    if (error) throw error;

    const items = (data ?? [])
      .map((row) => rowToItem(row, lite))
      .filter((book) =>
        book.title.toLowerCase().includes(lowered) ||
        book.author.toLowerCase().includes(lowered),
      )
      .slice(0, MAX_RESULTS);

    return NextResponse.json({ items });
  } catch (e) {
    console.error('[admin/books/search GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
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

    const body = await request.json().catch(() => ({}));
    const rawIsbns: string[] = Array.isArray(body.isbns) ? body.isbns : [];
    const isbns = Array.from(
      new Set(rawIsbns.map((s: string) => s.replace(/-/g, '').trim()).filter(isIsbnLike)),
    );

    if (isbns.length === 0) return NextResponse.json({ found: [], notFound: [] });

    const { data, error } = await supabaseAdmin
      .from('books')
      .select('isbn, title, author, cover_image, is_active')
      .in('isbn', isbns);

    if (error) throw error;

    const found: { isbn: string; title: string; author: string; coverImage: string }[] = [];
    const notFound: string[] = [];
    const byIsbn = new Map((data ?? []).map((row) => [row.isbn, row]));

    isbns.forEach((isbn) => {
      const row = byIsbn.get(isbn);
      if (row && row.is_active !== false) {
        found.push(rowToItem(row, false) as typeof found[0]);
      } else {
        notFound.push(isbn);
      }
    });

    return NextResponse.json({ found, notFound });
  } catch (e) {
    console.error('[admin/books/search POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

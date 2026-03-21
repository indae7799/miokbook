import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BookMeta } from '@/types/youtube-content';

async function verifyAdmin(req: NextRequest): Promise<boolean> {
  try {
    if (!adminAuth) return false;
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return false;
    const decoded = await adminAuth.verifyIdToken(token);
    return (decoded as { role?: string }).role === 'admin';
  } catch {
    return false;
  }
}

function mapBookRow(row: {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  cover_image: string;
  slug: string;
}): BookMeta {
  return {
    id: row.isbn,
    isbn: String(row.isbn ?? ''),
    title: String(row.title ?? ''),
    author: String(row.author ?? ''),
    publisher: String(row.publisher ?? ''),
    cover: String(row.cover_image ?? ''),
    slug: row.slug ? String(row.slug) : undefined,
    source: 'internal',
  };
}

async function fetchInternalBooks(isbns: string[]): Promise<BookMeta[]> {
  if (!supabaseAdmin || isbns.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < isbns.length; i += 100) chunks.push(isbns.slice(i, i + 100));

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await supabaseAdmin
        .from('books')
        .select('isbn, title, author, publisher, cover_image, slug')
        .in('isbn', chunk);

      if (error || !data) return [];
      return data.map(mapBookRow);
    })
  );

  return results.flat();
}

async function searchAladin(query: string): Promise<BookMeta[]> {
  const key = process.env.ALADIN_TTB_KEY ?? process.env.ALADIN_API_KEY;
  if (!key) return [];

  const params = new URLSearchParams({
    TTBKey: key,
    Query: query,
    QueryType: 'Keyword',
    MaxResults: '10',
    output: 'js',
    Version: '20131101',
    Cover: 'Big',
  });

  const res = await fetch(`http://www.aladin.co.kr/ttb/api/ItemSearch.aspx?${params}`, {
    next: { revalidate: 3600 },
  });
  const text = await res.text();
  let data: { item?: unknown[] };
  try {
    const cleaned = text.replace(/;\s*$/, '').trim();
    data = JSON.parse(cleaned) as { item?: unknown[] };
  } catch {
    return [];
  }

  const items = (data?.item ?? []) as Array<{
    isbn13?: string;
    isbn?: string;
    title?: string;
    author?: string;
    publisher?: string;
    cover?: string;
    link?: string;
  }>;

  return items.map((item) => ({
    id: item.isbn13 || item.isbn || '',
    isbn: item.isbn13 || item.isbn || '',
    title: item.title ?? '',
    author: item.author ?? '',
    publisher: item.publisher ?? '',
    cover: item.cover ?? '',
    link: item.link,
    source: 'aladin' as const,
  }));
}

export async function GET(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const isbnsParam = searchParams.get('isbns');
  const query = searchParams.get('q');

  if (isbnsParam != null) {
    const isbns = isbnsParam.split(',').map((s: string) => s.trim()).filter(Boolean);
    if (!isbns.length) return NextResponse.json([]);

    const books = await fetchInternalBooks(isbns);
    const sorted = isbns
      .map((isbn: string) => books.find((b: BookMeta) => b.isbn === isbn))
      .filter((b): b is BookMeta => !!b);

    return NextResponse.json(sorted);
  }

  if (query != null && query.trim()) {
    if (!(await verifyAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const results = await searchAladin(query.trim());
    return NextResponse.json(results);
  }

  return NextResponse.json({ error: 'isbns 또는 q 파라미터가 필요합니다.' }, { status: 400 });
}

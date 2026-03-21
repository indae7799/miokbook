import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

export async function POST(request: Request) {
  try {
    if (!adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const ttbKey = process.env.ALADIN_TTB_KEY;
    if (!ttbKey) {
      return NextResponse.json({ error: 'ALADIN_TTB_KEY missing' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    const { data: books, error } = await supabaseAdmin
      .from('books')
      .select('isbn, cover_image');

    if (error || !books) {
      return NextResponse.json({ error: 'BOOKS_FETCH_FAILED' }, { status: 500 });
    }

    let repaired = 0;
    let skipped = 0;
    const errors: string[] = [];
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < books.length; i++) {
      const book = books[i]!;
      const existing = (book.cover_image ?? '').trim();
      const isAladinUrl = existing.includes('image.aladin.co.kr');
      const hasValidUrl = existing.startsWith('http');

      if (!force && hasValidUrl && !isAladinUrl) {
        skipped++;
        continue;
      }
      if (!force && hasValidUrl && isAladinUrl && existing.endsWith('_1.jpg')) {
        skipped++;
        continue;
      }

      try {
        if (i > 0) await sleep(300);
        const url = `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}&itemIdType=ISBN13&ItemId=${book.isbn}&output=js&Version=20131101&Cover=Big`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const text = await res.text();
        const cleaned = text.replace(/;\s*$/, '');
        const json = JSON.parse(cleaned) as { item?: { cover?: string }[] };
        let cover = (json.item?.[0]?.cover ?? '').trim();
        if (cover.startsWith('//')) cover = `https:${cover}`;

        if (cover && cover.startsWith('http') && cover !== existing) {
          const { error: updateError } = await supabaseAdmin
            .from('books')
            .update({ cover_image: cover, updated_at: new Date().toISOString() })
            .eq('isbn', book.isbn);
          if (updateError) throw updateError;
          repaired++;
        } else if (!cover || !cover.startsWith('http')) {
          errors.push(`${book.isbn}: no valid cover`);
        } else {
          skipped++;
        }
      } catch (e) {
        errors.push(`${book.isbn}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ total: books.length, repaired, skipped, errors });
  } catch (e) {
    console.error('[repair-covers]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

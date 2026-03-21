import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';

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

    const { data: books, error } = await supabaseAdmin
      .from('books')
      .select('isbn, category');

    if (error || !books) {
      return NextResponse.json({ error: 'BOOKS_FETCH_FAILED' }, { status: 500 });
    }

    let updated = 0;
    const errors: string[] = [];

    for (const book of books) {
      const isbn = book.isbn;
      try {
        const url = `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}&itemIdType=ISBN13&ItemId=${isbn}&output=js&Version=20131101`;
        const res = await fetch(url);
        const text = await res.text();
        const cleaned = text.replace(/;\s*$/, '');
        const json = JSON.parse(cleaned) as { item?: { categoryName?: string }[] };
        const categoryName = json.item?.[0]?.categoryName;
        const category = mapAladinCategoryToSlug(categoryName);

        if (category !== book.category) {
          const { error: updateError } = await supabaseAdmin
            .from('books')
            .update({ category, updated_at: new Date().toISOString() })
            .eq('isbn', isbn);
          if (updateError) throw updateError;
          updated++;
        }
      } catch (e) {
        errors.push(`${isbn}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ total: books.length, updated, errors });
  } catch (e) {
    console.error('[repair-categories]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

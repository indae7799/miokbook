import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    const { data: books, error } = await supabaseAdmin
      .from('books')
      .select('isbn, category');

    if (error || !books) {
      return NextResponse.json({ error: 'BOOKS_FETCH_FAILED' }, { status: 500 });
    }

    let updated = 0;

    for (const book of books) {
      const slug = mapAladinCategoryToSlug(String(book.category ?? ''));
      if (slug === book.category) continue;
      const { error: updateError } = await supabaseAdmin
        .from('books')
        .update({ category: slug, updated_at: new Date().toISOString() })
        .eq('isbn', book.isbn);
      if (!updateError) updated++;
    }

    return NextResponse.json({
      ok: true,
      updated,
      scanned: books.length,
      message: updated > 0 ? `${updated} category normalized` : 'No changes needed',
    });
  } catch (e) {
    console.error('[normalize-categories]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

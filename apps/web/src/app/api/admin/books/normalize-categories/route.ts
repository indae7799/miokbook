import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { getBookCategoryDisplayName } from '@/lib/categories';
import { isBlockedAutoImportTarget } from '@/lib/auto-import-policy';
import { getMeilisearchServer } from '@/lib/meilisearch';

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
      .select('isbn, category, is_active');

    if (error || !books) {
      return NextResponse.json({ error: 'BOOKS_FETCH_FAILED' }, { status: 500 });
    }

    let updated = 0;
    let deactivated = 0;
    const meili = getMeilisearchServer();

    for (const book of books) {
      const currentCategory = String(book.category ?? '').trim();
      const mappedCategory = mapAladinCategoryToSlug(currentCategory);
      const normalizedCategory =
        getBookCategoryDisplayName(currentCategory) ||
        (mappedCategory !== '기타' ? mappedCategory : currentCategory);
      const blocked = isBlockedAutoImportTarget({ categoryName: currentCategory });

      if (blocked) {
        const { error: updateError } = await supabaseAdmin
          .from('books')
          .update({
            is_active: false,
            synced_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('isbn', book.isbn);
        if (!updateError) {
          deactivated++;
          if (meili) {
            try {
              await meili.index('books').deleteDocument(book.isbn);
            } catch (meiliError) {
              console.error('[normalize-categories] meilisearch delete failed', meiliError);
            }
          }
        }
        continue;
      }

      if (normalizedCategory === currentCategory) continue;

      const { error: updateError } = await supabaseAdmin
        .from('books')
        .update({
          category: normalizedCategory,
          synced_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('isbn', book.isbn);
      if (!updateError) updated++;
    }

    return NextResponse.json({
      ok: true,
      updated,
      deactivated,
      scanned: books.length,
      message:
        updated > 0 || deactivated > 0
          ? `${updated} category normalized, ${deactivated} deactivated`
          : 'No changes needed',
    });
  } catch (e) {
    console.error('[normalize-categories]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

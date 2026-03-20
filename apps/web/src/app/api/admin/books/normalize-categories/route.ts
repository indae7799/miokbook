import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';

export const dynamic = 'force-dynamic';

const BATCH = 400;

/**
 * Firestore books.category 를 알라딘 전체 경로 등 → 탭 slug(소설·경제…)로 통일.
 * 알라딘 API 없음. 이후 Meilisearch 동기화 권장.
 */
export async function POST(request: Request) {
  try {
    if (!adminAuth || !adminDb) {
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

    const db = adminDb;
    const snap = await db.collection('books').get();
    let updated = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      const cur = String(doc.data()?.category ?? '');
      const slug = mapAladinCategoryToSlug(cur);
      if (slug === cur) continue;
      batch.update(doc.ref, { category: slug, updatedAt: new Date() });
      batchCount += 1;
      updated += 1;
      if (batchCount >= BATCH) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      updated,
      scanned: snap.docs.length,
      message:
        updated > 0
          ? `${updated}건 category → slug 통일 완료. Meilisearch 동기화를 실행하세요.`
          : '변경할 문서 없음(이미 slug 형식).',
    });
  } catch (e) {
    console.error('[normalize-categories]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

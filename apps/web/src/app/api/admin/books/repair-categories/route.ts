import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';

export const dynamic = 'force-dynamic';

const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

export async function POST(request: Request) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Firebase Admin SDK 초기화 안 됨' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 });
    }

    const ttbKey = process.env.ALADIN_TTB_KEY;
    if (!ttbKey) {
      return NextResponse.json({ error: 'ALADIN_TTB_KEY 미설정' }, { status: 500 });
    }

    const snap = await adminDb.collection('books').get();
    let updated = 0;
    const errors: string[] = [];

    for (const doc of snap.docs) {
      const isbn = doc.id;
      try {
        const url = `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}&itemIdType=ISBN13&ItemId=${isbn}&output=js&Version=20131101`;
        const res = await fetch(url);
        const text = await res.text();
        const cleaned = text.replace(/;\s*$/, '');
        const json = JSON.parse(cleaned) as { item?: { categoryName?: string }[] };
        const categoryName = json.item?.[0]?.categoryName;

        const category = mapAladinCategoryToSlug(categoryName);
        const current = doc.data().category;

        if (category !== current) {
          await adminDb.collection('books').doc(isbn).update({
            category,
            updatedAt: new Date(),
          });
          updated++;
        }
      } catch (e) {
        errors.push(`${isbn}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      total: snap.docs.length,
      updated,
      errors,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[repair-categories]', e);
    return NextResponse.json(
      { error: msg.includes('ALADIN') ? 'ALADIN_TTB_KEY 미설정 또는 알라딘 API 오류' : 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

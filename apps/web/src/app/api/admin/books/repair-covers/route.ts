import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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

    // ?force=true → 알라딘 URL이 있어도 재확인 (잘못 변환된 URL 복구)
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const snap = await adminDb.collection('books').get();
    let repaired = 0;
    let skipped = 0;
    const errors: string[] = [];

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (let i = 0; i < snap.docs.length; i++) {
      const doc = snap.docs[i]!;
      const data = doc.data();
      const existing = (data.coverImage ?? '').trim();

      // force 아닐 때: 알라딘 URL이 아닌 경우만 스킵 (Firebase Storage 등)
      // force 일 때: 모두 재확인
      const isAladinUrl = existing.includes('image.aladin.co.kr');
      const hasValidUrl = existing.startsWith('http');

      if (!force && hasValidUrl && !isAladinUrl) {
        skipped++;
        continue;
      }
      if (!force && hasValidUrl && isAladinUrl && existing.endsWith('_1.jpg')) {
        // _1.jpg로 끝나는 알라딘 URL은 정상 — 스킵
        skipped++;
        continue;
      }

      const isbn = doc.id;
      try {
        if (i > 0) await sleep(300);
        const url = `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}&itemIdType=ISBN13&ItemId=${isbn}&output=js&Version=20131101&Cover=Big`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const text = await res.text();
        const cleaned = text.replace(/;\s*$/, '');
        const json = JSON.parse(cleaned) as { item?: { cover?: string }[] };
        let cover = (json.item?.[0]?.cover ?? '').trim();

        // 프로토콜 없는 URL 처리
        if (cover.startsWith('//')) cover = `https:${cover}`;

        if (cover && cover.startsWith('http') && cover !== existing) {
          await adminDb.collection('books').doc(isbn).update({
            coverImage: cover,
            updatedAt: new Date(),
          });
          repaired++;
        } else if (!cover || !cover.startsWith('http')) {
          errors.push(`${isbn}: 알라딘에서 표지 못 찾음`);
        } else {
          skipped++; // 동일한 URL
        }
      } catch (e) {
        errors.push(`${isbn}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      total: snap.docs.length,
      repaired,
      skipped,
      errors,
    });
  } catch (e) {
    console.error('[repair-covers]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

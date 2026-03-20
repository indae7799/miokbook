import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getMeilisearchClient } from '@/lib/meilisearch';

export const dynamic = 'force-dynamic';

const MAX_RESULTS = 20;

function isIsbnLike(s: string) {
  return /^\d{10,13}$/.test(s.replace(/-/g, ''));
}

function docToItem(isbn: string, d: Record<string, unknown>, lite: boolean) {
  return {
    isbn,
    title: String(d.title ?? ''),
    author: String(d.author ?? ''),
    ...(lite ? {} : { coverImage: String(d.coverImage ?? '') }),
  };
}

/** GET: 단일 키워드 검색 (제목/저자/ISBN) */
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

    if (!adminDb) return NextResponse.json({ items: [] });

    // 공백·쉼표로 분리 → ISBN 토큰 추출
    const tokens = keyword.split(/[\s,，]+/).map((t) => t.replace(/-/g, '').trim()).filter(Boolean);
    const isbnTokens = tokens.filter(isIsbnLike);

    // 토큰이 전부 ISBN이면 → 배치 직접 조회
    if (isbnTokens.length > 0 && isbnTokens.length === tokens.length) {
      const uniqueIsbns = Array.from(new Set(isbnTokens));
      const refs = uniqueIsbns.map((isbn) => adminDb!.collection('books').doc(isbn));
      const snaps = await adminDb.getAll(...refs);
      const items = snaps
        .filter((s) => s.exists && (s.data() as Record<string, unknown>).isActive !== false)
        .map((s) => docToItem(s.id, s.data() as Record<string, unknown>, lite));
      return NextResponse.json({ items });
    }

    // 제목/저자 키워드 검색: Meilisearch 우선
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
        /* Meilisearch 미실행 → Firestore fallback */
      }
    }

    const snap = await adminDb.collection('books').where('isActive', '==', true).limit(50).get();
    const lowered = keyword.toLowerCase();
    const items = snap.docs
      .map((doc) => docToItem(doc.id, doc.data() as Record<string, unknown>, lite))
      .filter((b) =>
        b.title.toLowerCase().includes(lowered) ||
        b.author.toLowerCase().includes(lowered)
      )
      .slice(0, MAX_RESULTS);

    return NextResponse.json({ items });
  } catch (e) {
    console.error('[admin/books/search GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

/** POST: ISBN 목록 일괄 조회 */
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

    if (!adminDb) return NextResponse.json({ found: [], notFound: [] });

    const body = await request.json().catch(() => ({}));
    const rawIsbns: string[] = Array.isArray(body.isbns) ? body.isbns : [];
    const isbns = Array.from(new Set(
      rawIsbns.map((s: string) => s.replace(/-/g, '').trim()).filter(isIsbnLike)
    ));

    if (isbns.length === 0) return NextResponse.json({ found: [], notFound: [] });

    const refs = isbns.map((isbn) => adminDb!.collection('books').doc(isbn));
    const snaps = await adminDb.getAll(...refs);

    const found: { isbn: string; title: string; author: string; coverImage: string }[] = [];
    const notFound: string[] = [];

    snaps.forEach((snap, i) => {
      if (snap.exists) {
        const d = snap.data() as Record<string, unknown>;
        if (d.isActive !== false) {
          found.push(docToItem(snap.id, d, false) as typeof found[0]);
        } else {
          notFound.push(isbns[i]);
        }
      } else {
        notFound.push(isbns[i]);
      }
    });

    return NextResponse.json({ found, notFound });
  } catch (e) {
    console.error('[admin/books/search POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

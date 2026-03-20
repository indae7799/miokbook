import { NextResponse } from 'next/server';
import { FieldPath, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { getMeilisearchServer } from '@/lib/meilisearch';
import { setFallbackBooksToRedis, type FallbackBookRow } from '@/lib/search-fallback-redis';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FIRESTORE_PAGE = 400;
const MEILI_CHUNK = 500;
const WAIT_MS = 240_000;

/**
 * 공백 완전 제거.
 * "교과서 소설 다보기 3" → "교과서소설다보기3"
 * Meilisearch에서 공백 없이 입력된 검색어와 매칭하기 위한 필드.
 *
 * NOTE: titleProcessed(숫자-한글 경계 공백삽입)는 불필요.
 *   "다보기3"은 Meilisearch prefix 매칭으로 "다보기" 검색 시 이미 응답함.
 */
function normalizeTitle(title: string): string {
  return title.replace(/\s+/g, '');
}

function docToMeili(doc: QueryDocumentSnapshot) {
  const d = doc.data();
  const publishDate = d?.publishDate;
  const createdAt = d?.createdAt;
  const updatedAt = d?.updatedAt;
  const rawTitle = String(d?.title ?? '');
  return {
    isbn: doc.id,
    slug: d?.slug ?? '',
    title: rawTitle,
    titleNormalized: normalizeTitle(rawTitle),
    author: d?.author ?? '',
    publisher: d?.publisher ?? '',
    description: d?.description ?? '',
    coverImage: d?.coverImage ?? '',
    listPrice: Number(d?.listPrice ?? 0),
    salePrice: Number(d?.salePrice ?? 0),
    category: mapAladinCategoryToSlug(String(d?.category ?? '')),
    status: String(d?.status ?? ''),
    isActive: true,
    publishDate:
      typeof publishDate?.toMillis === 'function'
        ? publishDate.toMillis()
        : publishDate instanceof Date
          ? publishDate.getTime()
          : null,
    rating: Number(d?.rating ?? 0),
    reviewCount: Number(d?.reviewCount ?? 0),
    salesCount: Number(d?.salesCount ?? 0),
    createdAt:
      typeof createdAt?.toMillis === 'function'
        ? createdAt.toMillis()
        : createdAt instanceof Date
          ? createdAt.getTime()
          : null,
    updatedAt:
      typeof updatedAt?.toMillis === 'function'
        ? updatedAt.toMillis()
        : updatedAt instanceof Date
          ? updatedAt.getTime()
          : null,
  };
}

function docToSlim(doc: QueryDocumentSnapshot): FallbackBookRow {
  const d = doc.data();
  return {
    isbn: doc.id,
    slug: d?.slug ?? '',
    title: d?.title ?? '',
    author: d?.author ?? '',
    coverImage: d?.coverImage ?? '',
    listPrice: Number(d?.listPrice ?? 0),
    salePrice: Number(d?.salePrice ?? 0),
    category: mapAladinCategoryToSlug(String(d?.category ?? '')),
    status: String(d?.status ?? ''),
    rating: Number(d?.rating ?? 0),
  };
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

    if (!adminDb) {
      return NextResponse.json({ error: 'Firestore not configured' }, { status: 503 });
    }

    const client = getMeilisearchServer();
    if (!client) {
      return NextResponse.json(
        {
          error:
            'Meilisearch not configured. Set MEILISEARCH_HOST and MEILISEARCH_MASTER_KEY in .env.local',
        },
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({ force: false }));
    const force = body.force === true;

    const index = client.index('books');

    await index.updateSearchableAttributes([
      'titleNormalized',
      'title',
      'author',
      'publisher',
      'description',
      'isbn',
    ]);

    await index.updateFilterableAttributes(['category', 'status', 'isActive', 'syncedAt']);
    await index.updateSortableAttributes([
      'createdAt',
      'salePrice',
      'listPrice',
      'rating',
      'salesCount',
    ]);

    const slimRows: FallbackBookRow[] = [];
    let lastDoc: QueryDocumentSnapshot | null = null;
    let lastTaskUid: number | undefined;
    let synced = 0;

    for (;;) {
      let q = adminDb.collection('books').where('isActive', '==', true);

      if (!force) {
        q = q.where('syncedAt', '==', null);
      }

      q = q.orderBy(FieldPath.documentId()).limit(FIRESTORE_PAGE);
      if (lastDoc) q = q.startAfter(lastDoc);

      const snap = await q.get();
      if (snap.empty) break;

      const meiliDocs = snap.docs.map(docToMeili);
      const activeSlim = snap.docs.map(docToSlim);
      activeSlim.forEach((r) => slimRows.push(r));

      for (let i = 0; i < meiliDocs.length; i += MEILI_CHUNK) {
        const chunk = meiliDocs.slice(i, i + MEILI_CHUNK).map((d) => ({ ...d, id: d.isbn }));
        const task = await index.addDocuments(chunk);
        lastTaskUid = task.taskUid;
        synced += chunk.length;
      }

      const syncBatch = adminDb.batch();
      const syncNow = Date.now();
      snap.docs.forEach((doc) => {
        syncBatch.update(doc.ref, { syncedAt: syncNow });
      });
      await syncBatch.commit();

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < FIRESTORE_PAGE) break;
    }

    if (synced === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: '동기화할 도서가 없습니다. 모든 도서가 이미 동기화되어 있습니다.',
        mode: force ? 'full' : 'incremental',
      });
    }

    if (lastTaskUid !== undefined) {
      const completed = await index.waitForTask(lastTaskUid, {
        timeOutMs: WAIT_MS,
        intervalMs: 400,
      });
      if (completed.status === 'failed') {
        const errMsg =
          (completed as { error?: { message?: string } }).error?.message ?? '인덱싱 실패';
        return NextResponse.json({ error: errMsg }, { status: 500 });
      }
    }

    if (force) {
      void setFallbackBooksToRedis(slimRows);
    }

    return NextResponse.json({
      success: true,
      synced,
      count: synced,
      mode: force ? 'full' : 'incremental',
      message: `${synced}건 동기화 완료 (${force ? '전체' : '신규/변경분만'})`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[admin/books/sync-meilisearch]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

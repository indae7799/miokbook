import { NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { mapAladinCategoryToSlug } from '@/lib/aladin-category';
import { invalidateCmsHomeMemCache } from '@/lib/store/home';
import { CMS_HOME_CACHE_TAG } from '@/lib/cache-tags';
import { FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

const ISBN13_REGEX = /^(978|979)\d{10}$/;
const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';

// ─── 유틸 ──────────────────────────────────────────────────────────────────

function normalizeIsbn(value: unknown): string {
  let s = String(value ?? '').trim().replace(/\.0+$/, '');
  if (/[eE][+\-]?\d/.test(s)) {
    const num = Number(s);
    if (!Number.isNaN(num) && Number.isFinite(num)) s = num.toFixed(0);
  }
  const digits = s.replace(/\D/g, '');
  return digits.length >= 13 ? digits.slice(0, 13) : digits;
}

function toValidIsbn(raw: string): string {
  const direct = String(raw).trim();
  if (ISBN13_REGEX.test(direct)) return direct;
  const normalized = normalizeIsbn(direct);
  return ISBN13_REGEX.test(normalized) ? normalized : '';
}

function slugify(title: string): string {
  return (
    title
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w가-힣\-]/g, '')
      .toLowerCase() || 'book'
  );
}

/**
 * 알라딘 저자 필드 정제
 * "홍길동 (지은이), 김번역 (옮긴이)" → "홍길동"  (첫 번째 저자 추출)
 * "홍길동 지음" → "홍길동"
 */
function cleanAuthor(raw: string | undefined): string {
  if (!raw) return '';
  // 괄호 안 역할 표시 제거 후 쉼표/세미콜론으로 분리 → 첫 저자만
  const first = raw.split(/[,;]/)[0] ?? '';
  return first
    .replace(/\s*[\(\（][^)\）]*[\)\）]/g, '') // (지은이) 제거
    .replace(/\s*(지은이|지음|옮긴이|옮김|그림|편저|엮음|감수|저)\s*/g, '')
    .trim();
}

/**
 * 알라딘 itemStatus → 내부 status 매핑
 */
const ITEM_STATUS_MAP: Record<string, 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition'> = {
  '정상판매': 'on_sale',
  '절판': 'out_of_print',
  '품절일시': 'out_of_print',
  '품절': 'out_of_print',
  '예약판매중': 'coming_soon',
  '구판': 'old_edition',
};

function mapItemStatus(v: string | undefined): 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition' {
  if (!v) return 'on_sale';
  return ITEM_STATUS_MAP[v.trim()] ?? 'on_sale';
}

// ─── 알라딘 API ────────────────────────────────────────────────────────────

interface AladinItem {
  title?: string;
  author?: string;
  publisher?: string;
  description?: string;
  cover?: string;
  priceStandard?: number; // 정가
  priceSales?: number;    // 판매가 (실제 할인가)
  pubDate?: string;
  categoryName?: string;
  itemStatus?: string;
  subInfo?: {
    itemPage?: number;
    originalTitle?: string;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAladinItemOnce(isbn: string, ttbKey: string, cover: string): Promise<AladinItem | null> {
  const url =
    `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}` +
    `&itemIdType=ISBN13&ItemId=${encodeURIComponent(isbn)}` +
    `&output=js&Version=20131101&Cover=${cover}&OptResult=subInfo`;

  let text: string;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    text = await res.text();
  } catch {
    return null;
  }

  try {
    const cleaned = text.replace(/;\s*$/, '').trim();
    const data = JSON.parse(cleaned) as { item?: AladinItem[]; errorCode?: number };
    if (data.errorCode || !data.item?.length) return null;
    return data.item[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchAladinItem(isbn: string, ttbKey: string): Promise<AladinItem | null> {
  // Big 커버로 먼저 시도
  const item = await fetchAladinItemOnce(isbn, ttbKey, 'Big');
  if (!item) return null;

  // cover가 비어 있으면 MidBig으로 재시도 (rate limit 응답 대비)
  if (!item.cover?.trim()) {
    await sleep(400);
    const retry = await fetchAladinItemOnce(isbn, ttbKey, 'MidBig');
    if (retry?.cover?.trim()) return retry;
  }

  return item;
}

function normalizeCoverUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  // 프로토콜 없는 경우 (//image.aladin...) → https 추가
  if (s.startsWith('//')) return `https:${s}`;
  if (!s.startsWith('http')) return '';
  return s;
}

// ─── 요청 타입 ─────────────────────────────────────────────────────────────

interface BulkCreatePayload {
  items: Array<{ isbn: string; stock: number }>;
}

// ─── API 핸들러 ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Firebase 서버 설정이 완료되지 않았습니다.' }, { status: 503 });
    }

    // ── 인증 ──
    const idToken = request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7)
      : null;
    if (!idToken) return NextResponse.json({ error: '인증 토큰이 없습니다.' }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: '토큰이 유효하지 않습니다. 다시 로그인해 주세요.' }, { status: 401 });
    }
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    // ── 바디 검증 ──
    const body = (await request.json().catch(() => null)) as BulkCreatePayload | null;
    const rawItems = body?.items;
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'ISBN 항목이 비어 있습니다.' }, { status: 400 });
    }
    if (rawItems.length > 500) {
      return NextResponse.json({ error: '한 번에 최대 500건까지 등록 가능합니다.' }, { status: 400 });
    }

    const ttbKey = process.env.ALADIN_TTB_KEY;
    if (!ttbKey) {
      return NextResponse.json({ error: 'ALADIN_TTB_KEY 환경변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    // ── ISBN 유효성 검사 ──
    const validItems: Array<{ isbn: string; stock: number }> = [];
    const results = { success: 0, skipped: 0, failed: 0, errors: [] as string[] };

    for (const row of rawItems) {
      const isbn = toValidIsbn(String(row?.isbn ?? ''));
      if (!isbn) {
        results.failed++;
        results.errors.push(`${row?.isbn}: 유효하지 않은 ISBN-13`);
        continue;
      }
      const stock = Math.max(0, Number(row?.stock) || 0);
      validItems.push({ isbn, stock });
    }

    if (validItems.length === 0) {
      return NextResponse.json({ ...results, message: '등록 가능한 ISBN이 없습니다.' });
    }

    const db = adminDb;
    const now = new Date();

    // ── Phase 1: 기존 도서 일괄 조회 (API 호출 전) ──────────────────────────
    const bookRefs = validItems.map((item) => db.collection('books').doc(item.isbn));
    const invRefs  = validItems.map((item) => db.collection('inventory').doc(item.isbn));

    const [bookSnaps, invSnaps] = await Promise.all([
      db.getAll(...bookRefs),
      db.getAll(...invRefs),
    ]);

    const existingMap = new Map<string, FirebaseFirestore.DocumentData>();
    const existingInvMap = new Map<string, number>();

    bookSnaps.forEach((snap) => {
      if (snap.exists) existingMap.set(snap.id, snap.data()!);
    });
    invSnaps.forEach((snap) => {
      if (snap.exists) existingInvMap.set(snap.id, Number(snap.data()?.stock ?? 0));
    });

    // ── Phase 2: 기존 도서 → 재고만 추가 (알라딘 API 없음) ─────────────────
    const existingToUpdate = validItems.filter((item) => existingMap.has(item.isbn));
    const newToCreate      = validItems.filter((item) => !existingMap.has(item.isbn));

    if (existingToUpdate.length > 0) {
      const batch = db.batch();
      for (const { isbn, stock: addQty } of existingToUpdate) {
        const invRef  = db.collection('inventory').doc(isbn);
        const bookRef = db.collection('books').doc(isbn);
        // 재고 추가 (기존 재고 + 업로드 수량)
        batch.set(invRef, { isbn, stock: FieldValue.increment(addQty), updatedAt: now }, { merge: true });
        batch.update(bookRef, { updatedAt: now });
        results.success++;
      }
      await batch.commit();
      console.log(`[bulk-create] 기존 도서 재고 추가: ${existingToUpdate.length}건 (알라딘 API 없음)`);
    }

    // ── Phase 3: 신규 도서 → 알라딘 API 호출 후 등록 ───────────────────────
    const savedBooks: FirebaseFirestore.DocumentData[] = [];

    for (let i = 0; i < newToCreate.length; i++) {
      const { isbn, stock } = newToCreate[i]!;
      // 첫 번째 이후 요청은 알라딘 rate limit 방지를 위해 300ms 대기
      if (i > 0) await sleep(300);
      const aladinItem = await fetchAladinItem(isbn, ttbKey);

      if (!aladinItem) {
        results.failed++;
        results.errors.push(`${isbn}: 알라딘에서 도서 정보를 찾을 수 없습니다.`);
        continue;
      }

      try {
        const title       = (aladinItem.title ?? '').trim();
        const author      = cleanAuthor(aladinItem.author);
        const publisher   = (aladinItem.publisher ?? '').trim();
        const description = (aladinItem.description ?? '').trim();
        const listPrice   = Math.max(0, Number(aladinItem.priceStandard) || 0);

        // 알라딘 실제 판매가 우선 사용, 없으면 정가의 90%
        const aladinSalePrice = Number(aladinItem.priceSales) || 0;
        const salePrice = aladinSalePrice > 0 && aladinSalePrice < listPrice
          ? aladinSalePrice
          : listPrice > 0 ? Math.floor(listPrice * 0.9) : 0;

        // 알라딘 Cover=Big 응답 URL을 그대로 사용 (변환 없음)
        // _1.jpg 제거 등의 변환은 알라딘 CDN에서 404를 유발함
        const coverImage = normalizeCoverUrl(aladinItem.cover ?? '');

        const category  = mapAladinCategoryToSlug(aladinItem.categoryName);
        const status    = mapItemStatus(aladinItem.itemStatus);
        const slug      = `${slugify(title)}-${isbn}`;

        let pubDate = now;
        if (aladinItem.pubDate) {
          const d = new Date(aladinItem.pubDate);
          if (!Number.isNaN(d.getTime())) pubDate = d;
        }

        const bookData = {
          isbn,
          slug,
          title,
          author,
          publisher,
          description,
          coverImage,
          listPrice,
          salePrice,
          category,
          status,
          isActive: true,
          rating: 0,
          reviewCount: 0,
          salesCount: 0,
          publishDate: pubDate,
          createdAt: now,
          updatedAt: now,
          syncedAt: null,
          // 추가 메타
          ...(aladinItem.subInfo?.itemPage ? { pageCount: aladinItem.subInfo.itemPage } : {}),
          ...(aladinItem.subInfo?.originalTitle ? { originalTitle: aladinItem.subInfo.originalTitle } : {}),
        };

        await db.runTransaction(async (tx) => {
          const bookRef = db.collection('books').doc(isbn);
          const invRef  = db.collection('inventory').doc(isbn);

          // 트랜잭션 내 최종 확인 (레이스 컨디션 방지)
          const freshBook = await tx.get(bookRef);
          if (freshBook.exists) {
            // 동시에 다른 요청이 등록한 경우 → 재고만 추가
            tx.set(invRef, { isbn, stock: FieldValue.increment(stock), updatedAt: now }, { merge: true });
            tx.update(bookRef, { updatedAt: now });
            return;
          }

          tx.set(bookRef, bookData);
          tx.set(invRef, { isbn, stock, reserved: 0, updatedAt: now });
        });

        savedBooks.push(bookData);
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(`${isbn}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    console.log(
      `[bulk-create] 완료 — 기존재고추가: ${existingToUpdate.length}건, ` +
      `신규등록: ${savedBooks.length}건, 실패: ${results.failed}건`
    );

    // ── Phase 4: Meilisearch 자동 동기화 ────────────────────────────────────
    if (savedBooks.length > 0) {
      const meiliHost = process.env.NEXT_PUBLIC_MEILISEARCH_HOST;
      const meiliKey  = process.env.MEILISEARCH_ADMIN_API_KEY || process.env.MEILISEARCH_MASTER_KEY;

      if (meiliHost) {
        try {
          const { MeiliSearch } = await import('meilisearch');
          const client = new MeiliSearch({ host: meiliHost, apiKey: meiliKey! });
          const index  = client.index('books');

          const meiliDocs = savedBooks.map((b) => ({
            ...b,
            id: b.isbn,
            publishDate: toEpoch(b.publishDate),
            createdAt:   toEpoch(b.createdAt),
            updatedAt:   toEpoch(b.updatedAt),
          }));

          const task = await index.addDocuments(meiliDocs);
          const done = await index.waitForTask(task.taskUid);

          if (done.status === 'succeeded') {
            const syncBatch = db.batch();
            const syncNow = Date.now();
            savedBooks.forEach((book) => {
              syncBatch.update(db.collection('books').doc(book.isbn), { syncedAt: syncNow });
            });
            await syncBatch.commit();
          } else {
            console.error('[bulk-create] Meilisearch task 실패:', done.error);
          }
        } catch (err) {
          console.error('[bulk-create] Meilisearch 동기화 실패:', err);
        }
      }
    }

    // ── Phase 5: 캐시 무효화 ────────────────────────────────────────────────
    if (results.success > 0) {
      invalidateCmsHomeMemCache();
      revalidateTag(CMS_HOME_CACHE_TAG);
      revalidatePath('/');
    }

    return NextResponse.json({
      success: results.success,
      failed:  results.failed,
      errors:  results.errors,
      detail: {
        stockAdded:  existingToUpdate.length, // 기존 도서 재고 추가
        newCreated:  savedBooks.length,        // 신규 등록
      },
    });
  } catch (e) {
    console.error('[bulk-create POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

function toEpoch(v: unknown): number | null {
  if (v instanceof Date) return v.getTime();
  if (v && typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  return null;
}

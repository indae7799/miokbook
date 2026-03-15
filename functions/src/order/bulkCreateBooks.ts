/**
 * PRD Section 17: CSV는 isbn, stock 2개만.
 * 나머지 도서 정보는 알라딘 ItemLookUp API로 수집.
 * 표지는 Firebase Storage에 다운로드 저장 (알라딘 URL 직접 저장 금지).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const ISBN13_REGEX = /^978\d{10}$/;
const ALADIN_BASE = 'https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx';
const DEFAULT_COVER_PATH = 'books/default_cover.jpg';

/** PRD: CSV/Excel 13자리숫자.0 등 → 소수점·공백 제거 후 13자리 숫자만 */
function normalizeIsbn(value: unknown): string {
  const s = String(value ?? '').trim().replace(/\.0+$/, '');
  const digits = s.replace(/\D/g, '');
  return digits.length >= 13 ? digits.slice(0, 13) : digits;
}

const itemStatusToStatus: Record<string, 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition'> = {
  '정상판매': 'on_sale',
  '절판': 'out_of_print',
  '품절일시': 'out_of_print',
  '예약판매중': 'coming_soon',
  '구판': 'old_edition',
};

function mapItemStatus(itemStatus: string | undefined): 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition' {
  if (!itemStatus) return 'on_sale';
  return itemStatusToStatus[itemStatus] ?? 'on_sale';
}

function slugify(title: string): string {
  return title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w가-힣\-]/g, '')
    .toLowerCase() || 'book';
}

interface AladinItem {
  title?: string;
  author?: string;
  publisher?: string;
  description?: string;
  cover?: string;
  priceStandard?: number;
  pubDate?: string;
  categoryName?: string;
  itemStatus?: string;
}

interface BulkCreateBooksPayload {
  items: Array<{ isbn: string; stock: number }>;
}

export const bulkCreateBooks = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const { items } = request.data ?? {};
    if (!Array.isArray(items) || items.length === 0) {
      throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');
    }

    const db = getFirestore();
    const bucket = getStorage().bucket();
    const ttbKey = process.env.ALADIN_TTB_KEY;
    if (!ttbKey) throw new HttpsError('failed-precondition', 'INTERNAL_ERROR');

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const row of items) {
      const rawIsbn = row?.isbn ?? '';
      const isbn = ISBN13_REGEX.test(rawIsbn)
        ? String(rawIsbn).trim()
        : ISBN13_REGEX.test(normalizeIsbn(rawIsbn))
          ? normalizeIsbn(rawIsbn)
          : '';
      const stock = Math.max(0, Number(row?.stock) ?? 0);
      if (!isbn || !ISBN13_REGEX.test(isbn)) {
        results.failed += 1;
        results.errors.push(`${rawIsbn}: invalid isbn (need ISBN-13)`);
        continue;
      }

      try {
        const url = `${ALADIN_BASE}?ttbkey=${encodeURIComponent(ttbKey)}&itemIdType=ISBN13&ItemId=${encodeURIComponent(isbn)}&output=js&Version=20131101&Cover=Big`;
        const res = await fetch(url);
        const text = await res.text();
        let data: { item?: AladinItem[]; errorCode?: number } = {};
        try {
          const cleaned = text.replace(/;\s*$/, '');
          data = JSON.parse(cleaned) as { item?: AladinItem[]; errorCode?: number };
        } catch {
          results.failed += 1;
          results.errors.push(`${isbn}: invalid aladin response`);
          continue;
        }

        if (data.errorCode || !data.item?.length) {
          results.failed += 1;
          results.errors.push(`${isbn}: aladin no data`);
          continue;
        }

        const item = data.item[0] as AladinItem;
        const title = item.title ?? '';
        const author = item.author ?? '';
        const publisher = item.publisher ?? '';
        const description = item.description ?? '';
        const listPrice = Math.max(0, Number(item.priceStandard) ?? 0) || 1;
        const salePrice = Math.floor(listPrice * 0.9);
        const category = (item.categoryName ?? '').trim() || '기타';
        const status = mapItemStatus(item.itemStatus);
        const slug = `${slugify(title)}-${isbn}`;
        const now = new Date();
        let pubDate = now;
        if (item.pubDate) {
          const d = new Date(item.pubDate);
          if (!Number.isNaN(d.getTime())) pubDate = d;
        }

        let coverImage: string;
        const coverUrl = item.cover?.trim();
        if (coverUrl && coverUrl.startsWith('http')) {
          try {
            const imgRes = await fetch(coverUrl);
            if (imgRes.ok) {
              const buf = Buffer.from(await imgRes.arrayBuffer());
              const path = `books/${isbn}/cover.jpg`;
              const file = bucket.file(path);
              await file.save(buf, {
                metadata: { contentType: 'image/jpeg' },
              });
              coverImage = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media`;
            } else {
              coverImage = await getDefaultCoverUrl(bucket);
            }
          } catch {
            coverImage = await getDefaultCoverUrl(bucket);
          }
        } else {
          coverImage = await getDefaultCoverUrl(bucket);
        }

        const book = {
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
          publishDate: pubDate,
          rating: 0,
          reviewCount: 0,
          salesCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        await db.runTransaction(async (tx) => {
          tx.set(db.collection('books').doc(isbn), book, { merge: true });
          tx.set(db.collection('inventory').doc(isbn), {
            isbn,
            stock,
            reserved: 0,
            updatedAt: now,
          }, { merge: true });
        });

        results.success += 1;
      } catch (e) {
        results.failed += 1;
        const msg = e instanceof Error ? e.message : String(e);
        results.errors.push(`${isbn}: ${msg}`);
      }
    }

    return { data: results };
  }
);

async function getDefaultCoverUrl(bucket: { name: string; file: (path: string) => { exists: () => Promise<[boolean]> } }): Promise<string> {
  const file = bucket.file(DEFAULT_COVER_PATH);
  const [exists] = await file.exists();
  if (exists) {
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(DEFAULT_COVER_PATH)}?alt=media`;
  }
  return '';
}

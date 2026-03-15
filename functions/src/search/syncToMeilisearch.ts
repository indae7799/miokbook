/**
 * PRD Section 10: books 문서 변경 시 Meilisearch 동기화.
 * Trigger: onDocumentWritten 'books/{isbn}'
 * 삭제 → deleteDocument(isbn)
 * 생성/수정 + isActive=true → addDocuments
 * 생성/수정 + isActive=false → deleteDocument
 * Zod parse 실패 시 에러 로그만 (throw 금지 — 무한 재시도 방지)
 */
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { MeiliSearch } from 'meilisearch';

const INDEX_NAME = 'books';

function getClient(): MeiliSearch | null {
  const host = process.env.MEILISEARCH_HOST;
  const apiKey = process.env.MEILISEARCH_MASTER_KEY;
  if (!host || !apiKey) return null;
  return new MeiliSearch({ host, apiKey });
}

export const syncToMeilisearch = onDocumentWritten(
  'books/{isbn}',
  async (event) => {
    const client = getClient();
    if (!client) {
      console.warn('syncToMeilisearch: MEILISEARCH_HOST or MEILISEARCH_MASTER_KEY not set');
      return;
    }

    const isbn = event.params?.isbn;
    if (!isbn) return;

    const after = event.data?.after;
    if (!after?.exists) {
      try {
        await client.index(INDEX_NAME).deleteDocument(isbn);
      } catch (e) {
        console.error('syncToMeilisearch deleteDocument', isbn, e);
      }
      return;
    }

    const d = after.data();
    const isActive = d?.isActive === true;

    if (!isActive) {
      try {
        await client.index(INDEX_NAME).deleteDocument(isbn);
      } catch (e) {
        console.error('syncToMeilisearch deleteDocument (inactive)', isbn, e);
      }
      return;
    }

    try {
      const publishDate = d?.publishDate;
      const createdAt = d?.createdAt;
      const updatedAt = d?.updatedAt;
      const doc = {
        isbn: after.id,
        slug: d?.slug ?? '',
        title: d?.title ?? '',
        author: d?.author ?? '',
        publisher: d?.publisher ?? '',
        description: d?.description ?? '',
        coverImage: d?.coverImage ?? '',
        listPrice: Number(d?.listPrice ?? 0),
        salePrice: Number(d?.salePrice ?? 0),
        category: String(d?.category ?? ''),
        status: String(d?.status ?? ''),
        isActive: true,
        publishDate: publishDate?.toMillis?.() ?? (publishDate instanceof Date ? publishDate.getTime() : null),
        rating: Number(d?.rating ?? 0),
        reviewCount: Number(d?.reviewCount ?? 0),
        salesCount: Number(d?.salesCount ?? 0),
        createdAt: createdAt?.toMillis?.() ?? (createdAt instanceof Date ? createdAt.getTime() : null),
        updatedAt: updatedAt?.toMillis?.() ?? (updatedAt instanceof Date ? updatedAt.getTime() : null),
      };
      await client.index(INDEX_NAME).addDocuments([doc]);
    } catch (e) {
      console.error('syncToMeilisearch addDocuments', isbn, e);
    }
  }
);

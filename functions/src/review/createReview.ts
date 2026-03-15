/**
 * PRD Section 15: 리뷰 작성.
 * ① orders에서 구매 이력 확인 (bookIsbn + userId, status=paid)
 * ② reviews 중복 확인 (1인 1권 1리뷰)
 * ③ reviews/{reviewId} 생성
 * ④ books/{isbn}.rating 재계산, reviewCount += 1
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

interface CreateReviewPayload {
  bookIsbn: string;
  rating: number;
  content: string;
}

function validateIsbn(isbn: unknown): string | null {
  if (typeof isbn !== 'string') return null;
  if (!/^978\d{10}$/.test(isbn)) return null;
  return isbn;
}

export const createReview = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as CreateReviewPayload | undefined;
    const bookIsbn = validateIsbn(data?.bookIsbn);
    const rating = typeof data?.rating === 'number' ? data.rating : 0;
    const content = typeof data?.content === 'string' ? data.content.trim() : '';

    if (!bookIsbn) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');
    if (rating < 1 || rating > 5) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');
    if (content.length < 10 || content.length > 1000) throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');

    const db = getFirestore();
    const uid = auth.uid;
    const userName = auth.token.name ?? auth.token.email ?? '회원';

    const ordersSnap = await db
      .collection('orders')
      .where('userId', '==', uid)
      .where('status', '==', 'paid')
      .get();

    let hasPurchased = false;
    ordersSnap.docs.forEach((doc) => {
      const items = (doc.data().items ?? []) as Array<{ isbn: string }>;
      if (items.some((i) => i.isbn === bookIsbn)) hasPurchased = true;
    });
    if (!hasPurchased) {
      throw new HttpsError('failed-precondition', 'PURCHASE_REQUIRED');
    }

    const existingSnap = await db
      .collection('reviews')
      .where('userId', '==', uid)
      .where('bookIsbn', '==', bookIsbn)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      throw new HttpsError('already-exists', 'ALREADY_REVIEWED');
    }

    const reviewRef = db.collection('reviews').doc();
    const bookRef = db.collection('books').doc(bookIsbn);
    const now = new Date();

    await db.runTransaction(async (tx) => {
      const allReviewsSnap = await tx.get(
        db.collection('reviews').where('bookIsbn', '==', bookIsbn)
      );
      const existingRatings = allReviewsSnap.docs.map((d) => d.data().rating as number);
      const newTotal = existingRatings.reduce((a, b) => a + b, 0) + rating;
      const newCount = existingRatings.length + 1;
      const newRating = Math.round((newTotal / newCount) * 100) / 100;

      tx.set(reviewRef, {
        reviewId: reviewRef.id,
        bookIsbn,
        userId: uid,
        userName,
        rating,
        content,
        createdAt: now,
      });

      tx.update(bookRef, {
        rating: newRating,
        reviewCount: newCount,
        updatedAt: now,
      });
    });

    return { data: { success: true, reviewId: reviewRef.id } };
  }
);

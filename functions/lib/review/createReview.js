"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReview = void 0;
/**
 * PRD Section 15: 리뷰 작성.
 * ① orders에서 구매 이력 확인 (bookIsbn + userId, status=paid)
 * ② reviews 중복 확인 (1인 1권 1리뷰)
 * ③ reviews/{reviewId} 생성
 * ④ books/{isbn}.ratingTotal += rating, reviewCount += 1  (O(1) 집계)
 *    → 조회 시 rating = ratingTotal / reviewCount 로 계산
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
function validateIsbn(isbn) {
    if (typeof isbn !== 'string')
        return null;
    if (!/^978\d{10}$/.test(isbn))
        return null;
    return isbn;
}
exports.createReview = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    const auth = request.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHORIZED');
    const data = request.data;
    const bookIsbn = validateIsbn(data?.bookIsbn);
    const rating = typeof data?.rating === 'number' ? data.rating : 0;
    const content = typeof data?.content === 'string' ? data.content.trim() : '';
    if (!bookIsbn)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    if (rating < 1 || rating > 5)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    if (content.length < 10 || content.length > 1000)
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    const db = (0, firestore_1.getFirestore)();
    const uid = auth.uid;
    const userName = auth.token.name ?? auth.token.email ?? '회원';
    const ordersSnap = await db
        .collection('orders')
        .where('userId', '==', uid)
        .where('status', '==', 'paid')
        .get();
    let hasPurchased = false;
    for (const doc of ordersSnap.docs) {
        const items = (doc.data().items ?? []);
        if (items.some((i) => i.isbn === bookIsbn)) {
            hasPurchased = true;
            break;
        }
    }
    if (!hasPurchased) {
        throw new https_1.HttpsError('failed-precondition', 'PURCHASE_REQUIRED');
    }
    const existingSnap = await db
        .collection('reviews')
        .where('userId', '==', uid)
        .where('bookIsbn', '==', bookIsbn)
        .limit(1)
        .get();
    if (!existingSnap.empty) {
        throw new https_1.HttpsError('already-exists', 'ALREADY_REVIEWED');
    }
    const reviewRef = db.collection('reviews').doc();
    const bookRef = db.collection('books').doc(bookIsbn);
    const now = new Date();
    await db.runTransaction(async (tx) => {
        const bookSnap = await tx.get(bookRef);
        if (!bookSnap.exists)
            throw new https_1.HttpsError('not-found', 'BOOK_NOT_FOUND');
        const bookData = bookSnap.data() ?? {};
        const currentRatingTotal = Number(bookData.ratingTotal ?? 0);
        const currentReviewCount = Number(bookData.reviewCount ?? 0);
        const nextRatingTotal = currentRatingTotal + rating;
        const nextReviewCount = currentReviewCount + 1;
        const nextRating = Math.round((nextRatingTotal / nextReviewCount) * 100) / 100;
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
            ratingTotal: firestore_1.FieldValue.increment(rating),
            reviewCount: firestore_1.FieldValue.increment(1),
            rating: nextRating,
            updatedAt: now,
        });
    });
    return { data: { success: true, reviewId: reviewRef.id } };
});

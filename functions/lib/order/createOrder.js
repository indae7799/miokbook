"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = void 0;
/**
 * PRD Section 8: 주문 생성.
 * 가격은 books 컬렉션에서 서버 계산 (클라이언트 값 신뢰 금지).
 * orders 생성: status=pending, expiresAt=now+30분.
 */
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const SHIPPING_FREE_THRESHOLD = 15000;
const SHIPPING_FEE = 3000;
const EXPIRES_MINUTES = 30;
exports.createOrder = (0, https_1.onCall)({ enforceAppCheck: false }, async (request) => {
    const auth = request.auth;
    if (!auth)
        throw new https_1.HttpsError('unauthenticated', 'UNAUTHORIZED');
    const data = request.data;
    if (!data?.items?.length || !data.shippingAddress) {
        throw new https_1.HttpsError('invalid-argument', 'VALIDATION_ERROR');
    }
    const db = (0, firestore_1.getFirestore)();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRES_MINUTES * 60 * 1000);
    const orderItems = [];
    let totalPrice = 0;
    for (const row of data.items) {
        const isbn = String(row.isbn ?? '').trim();
        const quantity = Math.min(10, Math.max(1, Number(row.quantity) ?? 1));
        if (!/^978\d{10}$/.test(isbn))
            throw new https_1.HttpsError('invalid-argument', 'INVALID_ISBN');
        const bookSnap = await db.collection('books').doc(isbn).get();
        if (!bookSnap.exists)
            throw new https_1.HttpsError('failed-precondition', 'BOOK_NOT_FOUND');
        const b = bookSnap.data();
        const unitPrice = Number(b.salePrice ?? 0);
        if (unitPrice <= 0)
            throw new https_1.HttpsError('failed-precondition', 'INVALID_PRICE');
        orderItems.push({
            isbn,
            slug: String(b.slug ?? ''),
            title: String(b.title ?? ''),
            coverImage: String(b.coverImage ?? ''),
            quantity,
            unitPrice,
        });
        totalPrice += quantity * unitPrice;
    }
    const shippingFee = totalPrice >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FEE;
    const addr = data.shippingAddress;
    const shippingAddress = {
        name: String(addr.name ?? '').trim(),
        phone: String(addr.phone ?? '').trim(),
        zipCode: String(addr.zipCode ?? '').trim(),
        address: String(addr.address ?? '').trim(),
        detailAddress: String(addr.detailAddress ?? '').trim(),
    };
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address) {
        throw new https_1.HttpsError('invalid-argument', 'INVALID_ADDRESS');
    }
    const orderRef = db.collection('orders').doc();
    const orderId = orderRef.id;
    await orderRef.set({
        orderId,
        userId: auth.uid,
        status: 'pending',
        shippingStatus: 'ready',
        items: orderItems,
        totalPrice,
        shippingFee,
        shippingAddress,
        paymentKey: null,
        createdAt: now,
        expiresAt,
        paidAt: null,
        cancelledAt: null,
        deliveredAt: null,
        returnStatus: 'none',
        returnReason: null,
    });
    return {
        data: {
            orderId,
            totalPrice,
            shippingFee,
            expiresAt: expiresAt.toISOString(),
        },
    };
});

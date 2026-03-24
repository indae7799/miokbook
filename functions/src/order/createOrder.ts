/**
 * PRD Section 8: 주문 생성.
 * 가격은 books 컬렉션에서 서버 계산 (클라이언트 값 신뢰 금지).
 * orders 생성: status=pending, expiresAt=now+30분.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const SHIPPING_FREE_THRESHOLD = 15000;
const SHIPPING_FEE = 2500;
const EXPIRES_MINUTES = 30;

interface CreateOrderPayload {
  items: Array<{ isbn: string; quantity: number }>;
  shippingAddress: {
    name: string;
    phone: string;
    zipCode: string;
    address: string;
    detailAddress: string;
  };
}

export const createOrder = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth;
    if (!auth) throw new HttpsError('unauthenticated', 'UNAUTHORIZED');

    const data = request.data as CreateOrderPayload | undefined;
    if (!data?.items?.length || !data.shippingAddress) {
      throw new HttpsError('invalid-argument', 'VALIDATION_ERROR');
    }

    const db = getFirestore();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRES_MINUTES * 60 * 1000);

    const orderItems: Array<{ isbn: string; slug: string; title: string; coverImage: string; quantity: number; unitPrice: number }> = [];
    let totalPrice = 0;

    for (const row of data.items) {
      const isbn = String(row.isbn ?? '').trim();
      const quantity = Math.min(10, Math.max(1, Number(row.quantity) ?? 1));
      if (!/^978\d{10}$/.test(isbn)) throw new HttpsError('invalid-argument', 'INVALID_ISBN');

      const bookSnap = await db.collection('books').doc(isbn).get();
      if (!bookSnap.exists) throw new HttpsError('failed-precondition', 'BOOK_NOT_FOUND');
      const b = bookSnap.data()!;
      const unitPrice = Number(b.salePrice ?? 0);
      if (unitPrice <= 0) throw new HttpsError('failed-precondition', 'INVALID_PRICE');

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
      throw new HttpsError('invalid-argument', 'INVALID_ADDRESS');
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
  }
);

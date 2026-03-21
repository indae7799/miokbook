import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const setOrder = vi.fn();
const books = new Map<string, Record<string, unknown>>();

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_options: unknown, handler: unknown) => handler,
  HttpsError: MockHttpsError,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id?: string) => {
        if (name === 'books') {
          return {
            id,
            get: async () => ({
              exists: !!id && books.has(id),
              data: () => (id ? books.get(id) : undefined),
            }),
          };
        }
        if (name === 'orders') {
          return {
            id: id ?? 'order_test_1',
            set: setOrder,
          };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    }),
  }),
}));

describe('createOrder', () => {
  beforeEach(() => {
    books.clear();
    setOrder.mockReset();
  });

  it('creates a pending order with server-side pricing and shipping fee', async () => {
    books.set('9781234567890', {
      slug: 'book-9781234567890',
      title: '테스트 도서',
      coverImage: '/cover.jpg',
      salePrice: 7000,
    });

    const { createOrder } = await import('../../functions/src/order/createOrder');
    const result = await createOrder({
      auth: { uid: 'user-1' },
      data: {
        items: [{ isbn: '9781234567890', quantity: 2 }],
        shippingAddress: {
          name: '홍길동',
          phone: '010-0000-0000',
          zipCode: '12345',
          address: '서울시 어딘가',
          detailAddress: '101호',
        },
      },
    } as never);

    expect(setOrder).toHaveBeenCalledTimes(1);
    const savedOrder = setOrder.mock.calls[0][0];
    expect(savedOrder.status).toBe('pending');
    expect(savedOrder.totalPrice).toBe(14000);
    expect(savedOrder.shippingFee).toBe(3000);
    expect(savedOrder.items).toEqual([
      expect.objectContaining({
        isbn: '9781234567890',
        quantity: 2,
        unitPrice: 7000,
      }),
    ]);
    expect(result.data).toEqual(
      expect.objectContaining({
        orderId: 'order_test_1',
        totalPrice: 14000,
        shippingFee: 3000,
      })
    );
  });
});

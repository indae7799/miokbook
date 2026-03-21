import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const orderDocs = new Map<string, Record<string, unknown>>();
const txUpdate = vi.fn();
const txSet = vi.fn();

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_options: unknown, handler: unknown) => handler,
  HttpsError: MockHttpsError,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        get: async () => ({
          exists: name === 'orders' ? orderDocs.has(id) : true,
          data: () => (name === 'orders' ? orderDocs.get(id) : undefined),
        }),
      }),
    }),
    runTransaction: async (callback: (tx: { get: (ref: { id: string }) => Promise<{ data: () => Record<string, unknown> | undefined }>; update: typeof txUpdate; set: typeof txSet }) => Promise<void>) =>
      callback({
        get: async (ref) => ({
          data: () => orderDocs.get(ref.id),
        }),
        update: txUpdate,
        set: txSet,
      }),
  }),
  FieldValue: {
    increment: (value: number) => ({ __increment: value }),
  },
}));

describe('confirmPayment', () => {
  beforeEach(() => {
    orderDocs.clear();
    txUpdate.mockReset();
    txSet.mockReset();
    process.env.TOSS_SECRET_KEY = 'test_secret';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ totalAmount: 15000 }),
      })
    );
  });

  it('marks the order as paid and commits stock/sales changes after Toss confirmation', async () => {
    orderDocs.set('order-1', {
      userId: 'user-1',
      status: 'pending',
      totalPrice: 12000,
      shippingFee: 3000,
      expiresAt: new Date(Date.now() + 60_000),
      items: [{ isbn: '9781234567890', quantity: 2 }],
    });

    const { confirmPayment } = await import('../../functions/src/payment/confirmPayment');
    const result = await confirmPayment({
      auth: { uid: 'user-1' },
      data: { orderId: 'order-1', paymentKey: 'pay_123' },
    } as never);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order-1' }),
      expect.objectContaining({
        status: 'paid',
        paymentKey: 'pay_123',
      })
    );
    expect(txSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: '9781234567890' }),
      expect.objectContaining({
        stock: { __increment: -2 },
        reserved: { __increment: -2 },
      }),
      { merge: true }
    );
    expect(result.data).toEqual({ success: true, orderId: 'order-1' });
  });
});

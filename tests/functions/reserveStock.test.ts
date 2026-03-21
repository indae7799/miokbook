import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const orderDocs = new Map<string, Record<string, unknown>>();
const inventoryDocs = new Map<string, Record<string, unknown>>();
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
          exists: name === 'orders' ? orderDocs.has(id) : inventoryDocs.has(id),
          data: () => (name === 'orders' ? orderDocs.get(id) : inventoryDocs.get(id)),
        }),
      }),
    }),
    runTransaction: async (callback: (tx: { get: (ref: { id: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>; set: typeof txSet }) => Promise<void>) =>
      callback({
        get: async (ref) => ({
          exists: inventoryDocs.has(ref.id),
          data: () => inventoryDocs.get(ref.id),
        }),
        set: txSet,
      }),
  }),
}));

describe('reserveStock', () => {
  beforeEach(() => {
    orderDocs.clear();
    inventoryDocs.clear();
    txSet.mockReset();
  });

  it('reserves inventory quantities for a pending order', async () => {
    orderDocs.set('order-1', {
      userId: 'user-1',
      status: 'pending',
      items: [{ isbn: '9781234567890', quantity: 2 }],
    });
    inventoryDocs.set('9781234567890', { stock: 5, reserved: 1 });

    const { reserveStock } = await import('../../functions/src/inventory/reserveStock');
    const result = await reserveStock({
      auth: { uid: 'user-1' },
      data: { orderId: 'order-1' },
    } as never);

    expect(txSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: '9781234567890' }),
      expect.objectContaining({
        isbn: '9781234567890',
        stock: 5,
        reserved: 3,
      }),
      { merge: true }
    );
    expect(result.data.ok).toBe(true);
  });
});

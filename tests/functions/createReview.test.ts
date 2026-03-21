import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

let hasExistingReview = false;
const paidOrders = [
  {
    data: () => ({
      items: [{ isbn: '9781234567890' }],
    }),
  },
];
const bookDocs = new Map<string, Record<string, unknown>>();
const txSet = vi.fn();
const txUpdate = vi.fn();

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_options: unknown, handler: unknown) => handler,
  HttpsError: MockHttpsError,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => {
      if (name === 'orders') {
        return {
          where: () => ({
            where: () => ({
              get: async () => ({ docs: paidOrders }),
            }),
          }),
        };
      }
      if (name === 'reviews') {
        return {
          where: () => ({
            where: () => ({
              limit: () => ({
                get: async () => ({ empty: !hasExistingReview }),
              }),
            }),
          }),
          doc: () => ({ id: 'review-1' }),
        };
      }
      if (name === 'books') {
        return {
          doc: (id: string) => ({
            id,
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
    runTransaction: async (callback: (tx: { get: (ref: { id: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>; set: typeof txSet; update: typeof txUpdate }) => Promise<void>) =>
      callback({
        get: async (ref) => ({
          exists: bookDocs.has(ref.id),
          data: () => bookDocs.get(ref.id),
        }),
        set: txSet,
        update: txUpdate,
      }),
  }),
  FieldValue: {
    increment: (value: number) => ({ __increment: value }),
  },
}));

describe('createReview', () => {
  beforeEach(() => {
    hasExistingReview = false;
    bookDocs.clear();
    txSet.mockReset();
    txUpdate.mockReset();
  });

  it('creates a review and updates aggregated book rating fields', async () => {
    bookDocs.set('9781234567890', {
      ratingTotal: 8,
      reviewCount: 2,
    });

    const { createReview } = await import('../../functions/src/review/createReview');
    const result = await createReview({
      auth: { uid: 'user-1', token: { name: '홍길동' } },
      data: {
        bookIsbn: '9781234567890',
        rating: 5,
        content: '정말 만족스러운 책이었습니다.',
      },
    } as never);

    expect(txSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'review-1' }),
      expect.objectContaining({
        bookIsbn: '9781234567890',
        userId: 'user-1',
        rating: 5,
      })
    );
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: '9781234567890' }),
      expect.objectContaining({
        ratingTotal: { __increment: 5 },
        reviewCount: { __increment: 1 },
        rating: 4.33,
      })
    );
    expect(result.data).toEqual({ success: true, reviewId: 'review-1' });
  });
});

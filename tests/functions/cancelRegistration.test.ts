import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const registrationDocs = new Map<string, Record<string, unknown>>();
const txUpdate = vi.fn();

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_options: unknown, handler: unknown) => handler,
  HttpsError: MockHttpsError,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        name,
      }),
    }),
    runTransaction: async (callback: (tx: { get: (ref: { id: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>; update: typeof txUpdate }) => Promise<void>) =>
      callback({
        get: async (ref) => ({
          exists: registrationDocs.has(ref.id),
          data: () => registrationDocs.get(ref.id),
        }),
        update: txUpdate,
      }),
  }),
  FieldValue: {
    increment: (value: number) => ({ __increment: value }),
  },
}));

describe('cancelRegistration', () => {
  beforeEach(() => {
    registrationDocs.clear();
    txUpdate.mockReset();
  });

  it('marks a registration as cancelled and decrements the event count', async () => {
    registrationDocs.set('registration-1', {
      userId: 'user-1',
      eventId: 'event-1',
      status: 'registered',
    });

    const { cancelRegistration } = await import('../../functions/src/events/cancelRegistration');
    const result = await cancelRegistration({
      auth: { uid: 'user-1' },
      data: { registrationId: 'registration-1', cancelReason: '일정 변경' },
    } as never);

    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'registration-1' }),
      expect.objectContaining({
        status: 'cancelled',
        cancelReason: '일정 변경',
      })
    );
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'event-1' }),
      expect.objectContaining({
        registeredCount: { __increment: -1 },
      })
    );
    expect(result.data.success).toBe(true);
  });
});

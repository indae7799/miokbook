import { beforeEach, describe, expect, it, vi } from 'vitest';

class MockHttpsError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

let existingRegistrationEmpty = true;
const eventDocs = new Map<string, Record<string, unknown>>();
const txSet = vi.fn();
const txUpdate = vi.fn();

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_options: unknown, handler: unknown) => handler,
  HttpsError: MockHttpsError,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      where: () => ({
        where: () => ({
          limit: () => ({
            get: async () => ({ empty: existingRegistrationEmpty }),
          }),
        }),
      }),
      doc: (id?: string) => ({
        id: id ?? 'registration-1',
      }),
    }),
    runTransaction: async (callback: (tx: { get: (ref: { id: string }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>; set: typeof txSet; update: typeof txUpdate }) => Promise<void>) =>
      callback({
        get: async (ref) => ({
          exists: eventDocs.has(ref.id),
          data: () => eventDocs.get(ref.id),
        }),
        set: txSet,
        update: txUpdate,
      }),
  }),
  FieldValue: {
    increment: (value: number) => ({ __increment: value }),
  },
}));

describe('registerEvent', () => {
  beforeEach(() => {
    existingRegistrationEmpty = true;
    eventDocs.clear();
    txSet.mockReset();
    txUpdate.mockReset();
  });

  it('creates an event registration and increments the event counter', async () => {
    eventDocs.set('event-1', {
      isActive: true,
      capacity: 10,
      registeredCount: 3,
    });

    const { registerEvent } = await import('../../functions/src/events/registerEvent');
    const result = await registerEvent({
      auth: { uid: 'user-1', token: { name: '홍길동' } },
      data: { eventId: 'event-1' },
    } as never);

    expect(txSet).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'registration-1' }),
      expect.objectContaining({
        eventId: 'event-1',
        userId: 'user-1',
        userName: '홍길동',
        status: 'registered',
      })
    );
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'event-1' }),
      expect.objectContaining({
        registeredCount: { __increment: 1 },
      })
    );
    expect(result.data).toEqual({ success: true, registrationId: 'registration-1' });
  });
});

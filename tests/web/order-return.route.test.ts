import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyIdToken = vi.fn();
const ordersMaybeSingle = vi.fn();
const ordersUpdateEq = vi.fn();
const ordersUpdate = vi.fn(() => ({ eq: ordersUpdateEq }));
const getStoreSettings = vi.fn();

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
  },
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken,
  },
}));

vi.mock('@/lib/store-settings.server', () => ({
  getStoreSettings,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table !== 'orders') {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: ordersMaybeSingle,
          }),
        }),
        update: ordersUpdate,
      };
    },
  },
}));

describe('POST /api/order/return', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: 'user-1' });
    ordersUpdateEq.mockResolvedValue({ error: null });
  });

  it('rejects return requests outside configured return period', async () => {
    getStoreSettings.mockResolvedValue({ returnPeriodDays: 3 });
    ordersMaybeSingle.mockResolvedValue({
      data: {
        order_id: 'order-1',
        user_id: 'user-1',
        status: 'paid',
        shipping_status: 'delivered',
        delivered_at: '2026-03-01T00:00:00.000Z',
        return_status: 'none',
      },
      error: null,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const { POST } = await import('../../apps/web/src/app/api/order/return/route');
    const response = await POST(
      new Request('http://localhost/api/order/return', {
        method: 'POST',
        headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: 'order-1', returnReason: '단순 변심' }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'RETURN_PERIOD_EXPIRED' });
    expect(ordersUpdate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('accepts a return request within configured return period', async () => {
    getStoreSettings.mockResolvedValue({ returnPeriodDays: 10 });
    ordersMaybeSingle.mockResolvedValue({
      data: {
        order_id: 'order-1',
        user_id: 'user-1',
        status: 'paid',
        shipping_status: 'delivered',
        delivered_at: '2026-03-05T00:00:00.000Z',
        return_status: 'none',
      },
      error: null,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-10T00:00:00.000Z'));

    const { POST } = await import('../../apps/web/src/app/api/order/return/route');
    const response = await POST(
      new Request('http://localhost/api/order/return', {
        method: 'POST',
        headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
        body: JSON.stringify({ orderId: 'order-1', returnReason: '단순 변심' }),
      })
    );

    expect(response.status).toBe(200);
    expect(ordersUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'return_requested',
        return_status: 'requested',
        return_reason: '단순 변심',
      })
    );
    vi.useRealTimers();
  });
});

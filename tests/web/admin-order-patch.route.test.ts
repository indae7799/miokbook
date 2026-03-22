import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyIdToken = vi.fn();
const invalidateStoreBookListsAndHome = vi.fn();
const ordersMaybeSingle = vi.fn();
const ordersUpdateEq = vi.fn();
const ordersUpdate = vi.fn(() => ({ eq: ordersUpdateEq }));

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

vi.mock('@/lib/invalidate-store-book-lists', () => ({
  invalidateStoreBookListsAndHome,
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

describe('PATCH /api/admin/orders/[orderId]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: 'admin-1', role: 'admin' });
    ordersUpdateEq.mockResolvedValue({ error: null });
  });

  it('rejects shipping transition without tracking info', async () => {
    ordersMaybeSingle.mockResolvedValue({
      data: {
        order_id: 'order-1',
        status: 'paid',
        shipping_status: 'ready',
        tracking_number: null,
        carrier: null,
        items: [],
      },
      error: null,
    });

    const { PATCH } = await import('../../apps/web/src/app/api/admin/orders/[orderId]/route');
    const response = await PATCH(
      new Request('http://localhost/api/admin/orders/order-1', {
        method: 'PATCH',
        headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
        body: JSON.stringify({ shippingStatus: 'shipped' }),
      }),
      { params: Promise.resolve({ orderId: 'order-1' }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'TRACKING_INFO_REQUIRED' });
    expect(ordersUpdate).not.toHaveBeenCalled();
  });

  it('stores tracking info when shipping starts', async () => {
    ordersMaybeSingle.mockResolvedValue({
      data: {
        order_id: 'order-1',
        status: 'paid',
        shipping_status: 'ready',
        tracking_number: null,
        carrier: null,
        items: [],
      },
      error: null,
    });

    const { PATCH } = await import('../../apps/web/src/app/api/admin/orders/[orderId]/route');
    const response = await PATCH(
      new Request('http://localhost/api/admin/orders/order-1', {
        method: 'PATCH',
        headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
        body: JSON.stringify({
          shippingStatus: 'shipped',
          carrier: 'CJ대한통운',
          trackingNumber: '1234567890',
        }),
      }),
      { params: Promise.resolve({ orderId: 'order-1' }) }
    );

    expect(response.status).toBe(200);
    expect(ordersUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        shipping_status: 'shipped',
        carrier: 'CJ대한통운',
        tracking_number: '1234567890',
      })
    );
    expect(invalidateStoreBookListsAndHome).not.toHaveBeenCalled();
  });
});

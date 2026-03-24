import { beforeEach, describe, expect, it, vi } from 'vitest';

const ordersMaybeSingle = vi.fn();

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
  },
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
      };
    },
  },
}));

describe('GET /api/orders/guest', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('requires phone number in addition to order id and name', async () => {
    const { GET } = await import('../../apps/web/src/app/api/orders/guest/route');
    const response = await GET(new Request('http://localhost/api/orders/guest?orderId=order-1&orderName=홍길동'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'MISSING_PARAMS' });
  });

  it('returns not found when phone does not match', async () => {
    ordersMaybeSingle.mockResolvedValue({
      data: {
        order_id: 'order-1',
        status: 'paid',
        shipping_status: 'ready',
        items: [],
        total_price: 10000,
        shipping_fee: 2500,
        created_at: '2026-03-22T00:00:00.000Z',
        delivered_at: null,
        shipping_address: {
          name: '홍길동',
          phone: '01012341234',
          address: '서울시 마포구',
        },
      },
      error: null,
    });

    const { GET } = await import('../../apps/web/src/app/api/orders/guest/route');
    const response = await GET(
      new Request('http://localhost/api/orders/guest?orderId=order-1&orderName=홍길동&orderPhone=01099998888')
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'NOT_FOUND' });
  });

  it('returns order when name and phone both match', async () => {
    ordersMaybeSingle.mockResolvedValue({
      data: {
        order_id: 'order-1',
        status: 'paid',
        shipping_status: 'ready',
        items: [],
        total_price: 10000,
        shipping_fee: 2500,
        created_at: '2026-03-22T00:00:00.000Z',
        delivered_at: null,
        shipping_address: {
          name: '홍길동',
          phone: '010-1234-1234',
          address: '서울시 마포구',
        },
      },
      error: null,
    });

    const { GET } = await import('../../apps/web/src/app/api/orders/guest/route');
    const response = await GET(
      new Request('http://localhost/api/orders/guest?orderId=order-1&orderName=홍길동&orderPhone=01012341234')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        orderId: 'order-1',
        status: 'paid',
        shippingFee: 2500,
      })
    );
  });
});

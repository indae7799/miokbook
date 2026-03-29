import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertOrder = vi.fn();
const inventoryIn = vi.fn();
const inventoryUpsert = vi.fn();
const booksIn = vi.fn();
const getStoreSettings = vi.fn();
const validateBookAvailabilityForOrder = vi.fn();

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
      if (table === 'books') {
        return {
          select: () => ({
            in: booksIn,
          }),
        };
      }

      if (table === 'inventory') {
        return {
          select: () => ({
            in: inventoryIn,
          }),
          upsert: inventoryUpsert,
        };
      }

      if (table === 'orders') {
        return {
          insert: insertOrder,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

vi.mock('@/lib/checkout-promotions', () => ({
  getPromotionOption: () => null,
  calculatePromotionDiscount: () => 0,
}));

vi.mock('@/lib/store-settings', () => ({
  calculateShippingFee: () => 0,
}));

vi.mock('@/lib/store-settings.server', () => ({
  getStoreSettings,
}));

vi.mock('@/lib/aladin-order-availability', () => ({
  validateBookAvailabilityForOrder,
}));

vi.mock('@/lib/order-id', () => ({
  attachDisplayOrderId: <T,>(value: T) => value,
  generateDisplayOrderId: () => 'ORD-TEST-001',
}));

describe('POST /api/order/guest-create external availability sync', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getStoreSettings.mockResolvedValue({});
    booksIn.mockResolvedValue({
      data: [
        {
          isbn: '9788932923598',
          slug: 'book-9788932923598',
          title: 'Recovered Book',
          cover_image: 'https://example.com/cover.jpg',
          sale_price: 12000,
          status: 'out_of_print',
        },
      ],
      error: null,
    });
    inventoryIn.mockResolvedValue({
      data: [
        {
          isbn: '9788932923598',
          stock: 0,
          reserved: 0,
        },
      ],
      error: null,
    });
    validateBookAvailabilityForOrder.mockResolvedValue({
      ok: true,
      status: 'on_sale',
      available: 999,
      stock: 999,
      reserved: 0,
    });
    insertOrder.mockResolvedValue({ error: null });
    inventoryUpsert.mockResolvedValue({ error: null });
  });

  it('uses recovered external stock instead of writing stock back to zero', async () => {
    const { POST } = await import('../../apps/web/src/app/api/order/guest-create/route');

    const response = await POST(
      new Request('http://localhost/api/order/guest-create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: [{ isbn: '9788932923598', quantity: 1 }],
          shippingAddress: {
            name: '홍길동',
            phone: '01012341234',
            zipCode: '12345',
            address: '서울시 마포구',
            detailAddress: '101호',
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(validateBookAvailabilityForOrder).toHaveBeenCalledWith('9788932923598', {
      status: 'out_of_print',
      stock: 0,
      reserved: 0,
    });
    expect(inventoryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        isbn: '9788932923598',
        stock: 999,
        reserved: 1,
      }),
    );
  });
});

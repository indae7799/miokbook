import { beforeEach, describe, expect, it, vi } from 'vitest';

const booksMaybeSingle = vi.fn();
const inventoryMaybeSingle = vi.fn();
const validateBookAvailabilityForOrder = vi.fn();

vi.mock('@/lib/design-mode', () => ({
  isUiDesignMode: () => false,
}));

vi.mock('next/cache', () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock('@/lib/aladin-order-availability', () => ({
  validateBookAvailabilityForOrder,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'books') {
        return {
          select: () => ({
            eq: (_column: string, value: string) => ({
              maybeSingle: () => booksMaybeSingle(value),
            }),
          }),
        };
      }

      if (table === 'inventory') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: inventoryMaybeSingle,
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

describe('getBookAndAvailableBySlug external availability sync', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.NODE_ENV = 'development';
    booksMaybeSingle.mockImplementation(async (value: string) => {
      if (value === '9788932923598') {
        return {
          data: {
            isbn: '9788932923598',
            slug: 'book-9788932923598',
            title: 'Recovered Book',
            author: 'Author',
            publisher: 'Publisher',
            description: 'Description',
            cover_image: 'https://example.com/cover.jpg',
            list_price: 15000,
            sale_price: 12000,
            category: 'novel',
            status: 'out_of_print',
            review_count: 0,
            rating_total: 0,
          },
        };
      }

      return { data: null };
    });
    inventoryMaybeSingle.mockResolvedValue({
      data: {
        stock: 0,
        reserved: 0,
      },
    });
    validateBookAvailabilityForOrder.mockResolvedValue({
      ok: true,
      status: 'on_sale',
      available: 999,
      stock: 999,
      reserved: 0,
    });
  });

  it('returns repaired status and available count for imported books', async () => {
    const { getBookAndAvailableBySlug } = await import('../../apps/web/src/lib/store/bookDetail');

    const result = await getBookAndAvailableBySlug('9788932923598');

    expect(validateBookAvailabilityForOrder).toHaveBeenCalledWith('9788932923598', {
      status: 'out_of_print',
      stock: 0,
      reserved: 0,
    });
    expect(result?.book.status).toBe('on_sale');
    expect(result?.available).toBe(999);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const insertBook = vi.fn();
const updateBookEq = vi.fn();
const upsertInventory = vi.fn();

vi.mock('@/lib/aladin-category', () => ({
  mapAladinCategoryToSlug: (categoryName?: string) => categoryName ?? 'other',
}));

vi.mock('@/lib/auto-import-policy', () => ({
  isBlockedAutoImportTarget: ({ categoryName }: { categoryName?: string | null }) =>
    String(categoryName ?? '').includes('blocked-category'),
}));

vi.mock('@/lib/book-cover-storage', () => ({
  normalizeExternalCoverUrl: (url: string) => url,
  persistExternalCoverImage: async (_isbn: string, url: string) => url,
}));

vi.mock('@/lib/firestore-cache', () => ({
  invalidate: vi.fn(),
}));

vi.mock('@/lib/invalidate-store-book-lists', () => ({
  invalidateStoreBookDetailPaths: vi.fn(),
  invalidateStoreBookListsAndHome: vi.fn(),
}));

vi.mock('@/lib/meilisearch', () => ({
  getMeilisearchServer: () => null,
}));

vi.mock('@/lib/store/bookDetail', () => ({
  invalidateBookDetailCaches: vi.fn(),
}));

vi.mock('@/lib/store/search', () => ({
  invalidateBookSearchCache: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'books') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle,
            }),
          }),
          insert: insertBook,
          update: () => ({
            eq: updateBookEq,
          }),
        };
      }

      if (table === 'inventory') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle,
            }),
          }),
          upsert: upsertInventory,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

describe('on-demand book import', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.ALADIN_TTB_KEY = 'test-ttb-key';
    maybeSingle.mockResolvedValue({ data: null });
    insertBook.mockResolvedValue({ error: null });
    upsertInventory.mockResolvedValue({ error: null });
  });

  it('returns external preview for out-of-print books without saving', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            item: [
              {
                title: 'Preview Only Book',
                author: 'Author',
                publisher: 'Publisher',
                description: 'Description',
                cover: 'https://example.com/cover.jpg',
                priceStandard: 15000,
                priceSales: 12000,
                pubDate: '2024-01-01',
                categoryName: 'humanities',
                itemStatus: '절판',
              },
            ],
          }),
      }),
    );

    const { getExternalBookDetailPreview, ensureBookByIsbnOnDemand } = await import('../../apps/web/src/lib/on-demand-book-import');

    const preview = await getExternalBookDetailPreview('9781234567890');
    const ensured = await ensureBookByIsbnOnDemand('9781234567890');

    expect(preview?.externalPreview).toBe(true);
    expect(preview?.book.status).toBe('out_of_print');
    expect(ensured).toBeNull();
    expect(insertBook).not.toHaveBeenCalled();
  });

  it('saves sellable books on demand', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            item: [
              {
                title: 'Sellable Book',
                author: 'Author',
                publisher: 'Publisher',
                description: 'Description',
                cover: 'https://example.com/cover.jpg',
                priceStandard: 15000,
                priceSales: 12000,
                pubDate: '2024-01-01',
                categoryName: 'humanities',
                itemStatus: '정상판매',
              },
            ],
          }),
      }),
    );

    const { getExternalBookDetailPreview, ensureBookByIsbnOnDemand } = await import('../../apps/web/src/lib/on-demand-book-import');

    const preview = await getExternalBookDetailPreview('9781234567890');
    const ensured = await ensureBookByIsbnOnDemand('9781234567890');

    expect(preview).toBeNull();
    expect(ensured).toEqual({ slug: 'sellable-book-9781234567890', created: true });
    expect(insertBook).toHaveBeenCalled();
  });
});

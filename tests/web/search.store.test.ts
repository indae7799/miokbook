import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/aladin-category', () => ({
  mapAladinCategoryToSlug: (categoryName?: string) => categoryName ?? 'other',
}));

vi.mock('@/lib/auto-import-policy', () => ({
  isBlockedAutoImportTarget: () => false,
}));

vi.mock('@/lib/book-cover-storage', () => ({
  normalizeExternalCoverUrl: (url: string) => url,
}));

vi.mock('@/lib/design-mode', () => ({
  isUiDesignMode: () => false,
}));

vi.mock('@/lib/meilisearch', () => ({
  getMeilisearchClient: () => null,
  getMeilisearchServer: () => null,
}));

vi.mock('@/lib/search-ranking', () => ({
  sortByKeywordAndTitle: <T,>(items: T[]) => items,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        in: async () => ({ data: [], error: null }),
      }),
    }),
  },
}));

describe('searchBooksData external category fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.ALLOW_SEARCH_FIRESTORE_FALLBACK = 'false';
    process.env.ALADIN_TTB_KEY = 'test-ttb-key';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            item: [
              {
                title: 'Novel Book',
                author: 'Author',
                isbn13: '9788967038816',
                cover: 'https://example.com/cover.jpg',
                priceStandard: 15000,
                categoryName: 'novel',
                stockStatus: '',
              },
            ],
          }),
      }),
    );
  });

  it('does not return external books when requested category does not match', async () => {
    const { searchBooksData } = await import('../../apps/web/src/lib/store/search');

    const result = await searchBooksData({
      keyword: '9788967038816',
      category: 'essay',
      page: 1,
      pageSize: 20,
      sort: 'latest',
    });

    expect(result).toEqual({ books: [], totalCount: 0 });
  });

  it('returns external books when requested category matches', async () => {
    const { searchBooksData } = await import('../../apps/web/src/lib/store/search');

    const result = await searchBooksData({
      keyword: '9788967038816',
      category: 'novel',
      page: 1,
      pageSize: 20,
      sort: 'latest',
    });

    expect(result.totalCount).toBe(1);
    expect(result.fromAladin).toBe(true);
    expect(result.books[0]?.isbn).toBe('9788967038816');
    expect(result.books[0]?.category).toBe('novel');
  });
});

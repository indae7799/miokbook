import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchMock = vi.fn();

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
  getMeilisearchClient: () => ({
    index: () => ({
      search: searchMock,
    }),
  }),
  getMeilisearchServer: () => null,
}));

vi.mock('@/lib/search-ranking', () => ({
  sortByKeywordAndTitle: <T extends { title: string }>(items: T[], keyword: string) => {
    const kw = keyword.replace(/\s+/g, '').toLowerCase();
    return [...items].sort((a, b) => {
      const aHas = a.title.replace(/\s+/g, '').toLowerCase().includes(kw) ? 1 : 0;
      const bHas = b.title.replace(/\s+/g, '').toLowerCase().includes(kw) ? 1 : 0;
      return bHas - aHas;
    });
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {},
}));

describe('searchBooksData meilisearch keyword behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    searchMock.mockResolvedValue({
      estimatedTotalHits: 50,
      hits: [
        {
          isbn: '9780000000001',
          slug: 'book-1',
          title: 'Eastern Philosophy Intro',
          author: 'Author A',
          coverImage: '/1.jpg',
          listPrice: 10000,
          salePrice: 9000,
          category: 'humanities',
        },
        {
          isbn: '9780000000002',
          slug: 'book-2',
          title: 'Philosophy Intro',
          author: 'Eastern Thought Lab',
          coverImage: '/2.jpg',
          listPrice: 10000,
          salePrice: 9000,
          category: 'humanities',
        },
      ],
    });
  });

  it('does not collapse results to title-only matches', async () => {
    const { searchBooksData } = await import('../../apps/web/src/lib/store/search');

    const result = await searchBooksData({
      keyword: 'eastern',
      page: 1,
      pageSize: 20,
      sort: 'latest',
    });

    expect(result.totalCount).toBe(50);
    expect(result.books.map((book) => book.isbn)).toEqual(['9780000000001', '9780000000002']);
  });

  it('keeps author and category keyword matches in overall results', async () => {
    const { searchBooksData } = await import('../../apps/web/src/lib/store/search');

    const result = await searchBooksData({
      keyword: 'eastern',
      page: 1,
      pageSize: 20,
      sort: 'latest',
    });

    expect(result.books).toHaveLength(2);
    expect(result.books[1]?.author).toContain('Eastern');
  });

  it('applies category tab filtering as a final guard', async () => {
    searchMock.mockResolvedValueOnce({
      estimatedTotalHits: 2,
      hits: [
        {
          isbn: '9780000000003',
          slug: 'book-3',
          title: 'Eastern Humanities',
          author: 'Author A',
          coverImage: '/3.jpg',
          listPrice: 10000,
          salePrice: 9000,
          category: 'humanities',
        },
        {
          isbn: '9780000000004',
          slug: 'book-4',
          title: 'Eastern Business',
          author: 'Author A',
          coverImage: '/4.jpg',
          listPrice: 10000,
          salePrice: 9000,
          category: 'business',
        },
      ],
    });

    const { searchBooksData } = await import('../../apps/web/src/lib/store/search');

    const result = await searchBooksData({
      keyword: 'eastern',
      category: 'humanities',
      page: 1,
      pageSize: 20,
      sort: 'latest',
    });

    expect(result.books.map((book) => book.isbn)).toEqual(['9780000000003']);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const searchBooksData = vi.fn();

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      }),
  },
}));

vi.mock('zod', () => ({
  z: {
    string: () => ({ optional: () => ({}) }),
    coerce: {
      number: () => ({
        int: () => ({
          min: () => ({
            max: () => ({
              default: () => ({}),
            }),
            default: () => ({}),
          }),
        }),
      }),
    },
    enum: () => ({ optional: () => ({}) }),
    object: () => ({
      safeParse: (input: Record<string, string | undefined>) => ({
        success: true,
        data: {
          keyword: input.keyword,
          category: input.category,
          page: input.page ? Number(input.page) : 1,
          pageSize: input.pageSize ? Number(input.pageSize) : 12,
          sort: input.sort,
          status: input.status,
          autocomplete: input.autocomplete,
        },
      }),
      parse: () => ({ page: 1, pageSize: 12 }),
    }),
  },
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: null,
}));

vi.mock('@/lib/meilisearch', () => ({
  getMeilisearchClient: () => null,
}));

vi.mock('@/lib/store/search', () => ({
  searchBooksData,
}));

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('returns normalized search payload from the shared search helper', async () => {
    searchBooksData.mockResolvedValue({
      books: [
        {
          isbn: '9781234567890',
          slug: 'book-slug-9781234567890',
          title: '테스트 도서',
          author: '홍길동',
          coverImage: '/cover.jpg',
          listPrice: 15000,
          salePrice: 12000,
        },
      ],
      totalCount: 1,
    });

    const { GET } = await import('../../apps/web/src/app/api/search/route');
    const response = await GET(new Request('http://localhost/api/search?keyword=%ED%85%8C%EC%8A%A4%ED%8A%B8&page=2'));
    const json = await response.json();

    expect(searchBooksData).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: '테스트',
        page: 2,
        pageSize: 12,
      })
    );
    expect(json.totalCount).toBe(1);
    expect(json.data.totalHits).toBe(1);
    expect(json.books[0].title).toBe('테스트 도서');
  });
});

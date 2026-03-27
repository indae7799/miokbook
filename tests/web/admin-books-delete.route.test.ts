import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyIdToken = vi.fn();
const deleteBooksEq = vi.fn();
const deleteInventoryEq = vi.fn();
const selectMaybeSingle = vi.fn();
const deleteDocument = vi.fn();
const invalidate = vi.fn();
const invalidateStoreBookDetailPaths = vi.fn();
const invalidateStoreBookListsAndHome = vi.fn();
const invalidateBookDetailCaches = vi.fn();
const invalidateBookSearchCache = vi.fn();

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

vi.mock('@/lib/firestore-cache', () => ({
  invalidate,
}));

vi.mock('@/lib/invalidate-store-book-lists', () => ({
  invalidateStoreBookDetailPaths,
  invalidateStoreBookListsAndHome,
}));

vi.mock('@/lib/meilisearch', () => ({
  getMeilisearchServer: () => ({
    index: () => ({
      deleteDocument,
    }),
  }),
}));

vi.mock('@/lib/store/bookDetail', () => ({
  invalidateBookDetailCaches,
}));

vi.mock('@/lib/store/search', () => ({
  invalidateBookSearchCache,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'books') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: selectMaybeSingle,
            }),
          }),
          delete: () => ({
            eq: deleteBooksEq,
          }),
        };
      }

      if (table === 'inventory') {
        return {
          delete: () => ({
            eq: deleteInventoryEq,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  },
}));

describe('DELETE /api/admin/books/[isbn]', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ role: 'admin' });
    selectMaybeSingle.mockResolvedValue({ data: { slug: 'book-slug-9788967035396' }, error: null });
    deleteInventoryEq.mockResolvedValue({ error: null });
    deleteBooksEq.mockResolvedValue({ error: null });
    deleteDocument.mockResolvedValue({});
  });

  it('removes book-related state together with the book record', async () => {
    const { DELETE } = await import('../../apps/web/src/app/api/admin/books/[isbn]/route');

    const response = await DELETE(
      new Request('http://localhost/api/admin/books/9788967035396', {
        method: 'DELETE',
        headers: { authorization: 'Bearer admin-token' },
      }),
      { params: Promise.resolve({ isbn: '9788967035396' }) },
    );

    expect(response.status).toBe(200);
    expect(deleteInventoryEq).toHaveBeenCalledWith('isbn', '9788967035396');
    expect(deleteBooksEq).toHaveBeenCalledWith('isbn', '9788967035396');
    expect(deleteDocument).toHaveBeenCalledWith('9788967035396');
    expect(invalidate).toHaveBeenCalledWith('book', 'book:9788967035396');
    expect(invalidateBookDetailCaches).toHaveBeenCalledWith('9788967035396', 'book-slug-9788967035396');
    expect(invalidateBookSearchCache).toHaveBeenCalled();
    expect(invalidateStoreBookDetailPaths).toHaveBeenCalledWith('9788967035396', 'book-slug-9788967035396');
    expect(invalidateStoreBookListsAndHome).toHaveBeenCalled();
  });
});

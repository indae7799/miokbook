import type { BookFilters } from '@online-miok/schemas';

export const queryKeys = {
  books: {
    all: () => ['books'] as const,
    list: (filters: BookFilters) => ['books', 'list', filters] as const,
    detail: (slug: string) => ['books', 'detail', slug] as const,
    byIsbn: (isbn: string) => ['books', 'isbn', isbn] as const,
    reviews: (isbn: string) => ['books', 'reviews', isbn] as const,
  },
  orders: {
    list: (userId: string) => ['orders', 'list', userId] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  },
  events: {
    all: () => ['events'] as const,
    detail: (id: string) => ['events', 'detail', id] as const,
  },
  articles: {
    all: () => ['articles'] as const,
    detail: (slug: string) => ['articles', 'detail', slug] as const,
  },
  cms: {
    home: () => ['cms', 'home'] as const,
  },
  admin: {
    dashboard: () => ['admin', 'dashboard'] as const,
    books: (page = 1, pageSize = 30) => ['admin', 'books', page, pageSize] as const,
    orders: (status?: string, from?: string, to?: string) =>
      (['admin', 'orders', status ?? '', from ?? '', to ?? '', 1, 30] as const),
    ordersPage: (page: number, pageSize: number, status?: string, from?: string, to?: string) =>
      (['admin', 'orders', status ?? '', from ?? '', to ?? '', page, pageSize] as const),
    cms: () => ['admin', 'cms'] as const,
    events: () => ['admin', 'events'] as const,
    eventRegistrations: (eventId: string) => ['admin', 'events', eventId, 'registrations'] as const,
    content: () => ['admin', 'content'] as const,
    youtubeContent: () => ['admin', 'youtubeContent'] as const,
  },
};

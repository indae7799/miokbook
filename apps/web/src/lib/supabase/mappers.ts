import type { Database, Json } from './types';

type BookRow = Database['public']['Tables']['books']['Row'];
type InventoryRow = Database['public']['Tables']['inventory']['Row'];
type ReviewRow = Database['public']['Tables']['reviews']['Row'];
type ConcertRow = Database['public']['Tables']['concerts']['Row'];

function jsonObject(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function isoOrNull(value: string | null | undefined): string | null {
  return value ?? null;
}

export function mapBookRow(row: BookRow, stock = 0) {
  return {
    isbn: row.isbn,
    slug: row.slug,
    title: row.title,
    author: row.author,
    publisher: row.publisher,
    description: row.description,
    coverImage: row.cover_image,
    listPrice: row.list_price,
    salePrice: row.sale_price,
    category: row.category,
    status: row.status,
    isActive: row.is_active,
    publishDate: isoOrNull(row.publish_date),
    rating: Number(row.rating ?? 0),
    ratingTotal: row.rating_total,
    reviewCount: row.review_count,
    salesCount: row.sales_count,
    tableOfContents: row.table_of_contents,
    syncedAt: isoOrNull(row.synced_at),
    stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInventoryByIsbn(rows: InventoryRow[]) {
  const stockByIsbn: Record<string, number> = {};
  for (const row of rows) {
    stockByIsbn[row.isbn] = Number(row.stock ?? 0);
  }
  return stockByIsbn;
}

export function mapReviewRow(row: ReviewRow) {
  return {
    reviewId: row.review_id,
    bookIsbn: row.book_isbn,
    userId: row.user_id,
    userName: row.user_name ?? '',
    rating: Number(row.rating ?? 0),
    content: row.content ?? '',
    createdAt: row.created_at ?? null,
  };
}

export function mapConcertRow(row: ConcertRow) {
  return {
    id: row.id,
    title: row.title ?? '',
    slug: row.slug ?? '',
    isActive: row.is_active ?? false,
    imageUrl: row.image_url ?? '',
    tableRows: Array.isArray(row.table_rows) ? row.table_rows : [],
    bookIsbns: row.book_isbns ?? [],
    description: row.description ?? '',
    googleMapsEmbedUrl: row.google_maps_embed_url ?? '',
    date: isoOrNull(row.date),
    order: row.order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function extractCmsValue(value: Json | null | undefined): Record<string, unknown> {
  return jsonObject(value);
}

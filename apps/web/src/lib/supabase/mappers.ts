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
    archiveTitle: row.archive_title ?? '',
    slug: row.slug ?? '',
    isActive: row.is_active ?? false,
    imageUrl: row.image_url ?? '',
    eventCardImageUrl: row.event_card_image_url ?? '',
    tableRows: Array.isArray(row.table_rows) ? row.table_rows : [],
    bookIsbns: row.book_isbns ?? [],
    description: row.description ?? '',
    googleMapsEmbedUrl: row.google_maps_embed_url ?? '',
    bookingUrl: row.booking_url ?? '',
    bookingLabel: row.booking_label ?? '예약 신청',
    bookingNoticeTitle: row.booking_notice_title ?? '예약 안내',
    bookingNoticeBody: row.booking_notice_body ?? '북콘서트 신청은 예약 페이지에서 진행됩니다.',
    feeLabel: row.fee_label ?? '',
    feeNote: row.fee_note ?? '',
    hostNote: row.host_note ?? '',
    statusBadge: row.status_badge ?? '',
    ticketPrice: Number(row.ticket_price ?? 0),
    ticketOpen: row.ticket_open ?? false,
    ticketSoldCount: Number(row.ticket_sold_count ?? 0),
    reviewYoutubeIds: row.review_youtube_ids ?? [],
    date: isoOrNull(row.date),
    order: row.order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function extractCmsValue(value: Json | null | undefined): Record<string, unknown> {
  return jsonObject(value);
}

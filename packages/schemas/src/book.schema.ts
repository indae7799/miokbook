import { z } from 'zod';

export const BookStatusEnum = z.enum([
  'on_sale', 'out_of_print', 'coming_soon', 'old_edition'
]);

export const BookSchema = z.object({
  isbn:         z.string().regex(/^978\d{10}$/),
  slug:         z.string().min(1),
  title:        z.string().min(1),
  author:       z.string().min(1),
  publisher:    z.string().min(1),
  description:  z.string(),
  coverImage:   z.string().url(),
  listPrice:    z.number().int().positive(),
  salePrice:    z.number().int().positive(),
  category:     z.string().min(1),
  status:       BookStatusEnum,
  isActive:     z.boolean().default(true),
  publishDate:  z.date(),
  rating:       z.number().min(0).max(5).default(0),
  reviewCount:  z.number().int().nonnegative().default(0),
  salesCount:   z.number().int().nonnegative().default(0),
  tableOfContents: z.string().optional(), // 목차 (마크다운, 선택 필드)
  syncedAt:    z.number().nullable().optional(), // Meilisearch 동기화 일시 (ms)
  createdAt:   z.date(),
  updatedAt:   z.date(),
});
export type Book = z.infer<typeof BookSchema>;

export type BookFilters = {
  keyword?:  string;
  category?: string;
  page?:     number;
  pageSize?: number;
  sort?:     'latest' | 'price_asc' | 'price_desc' | 'rating';
  status?:   'on_sale' | 'coming_soon';
};

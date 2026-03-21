import { z } from 'zod';

export const BannerSchema = z.object({
  id:        z.string(),
  imageUrl:  z.string().url(),
  linkUrl:   z.string(),
  position:  z.enum(['main_hero', 'main_top', 'sidebar']),
  isActive:  z.boolean(),
  startDate: z.date(),
  endDate:   z.date(),
  order:     z.number().int().nonnegative(),
});

export const FeaturedBookSchema = z.object({
  isbn:               z.string(),
  title:              z.string(),
  coverImage:         z.string().url(),
  priority:           z.number().int().nonnegative(),
  recommendationText: z.string(), // 독립서점 추천 이유
});

export const ThemeCurationSchema = z.object({
  id:    z.string(),
  title: z.string(), // "비 오는 날 읽기 좋은 책"
  isbns: z.array(z.string()),
  order: z.number().int().nonnegative(),
});

export const PopupSchema = z.object({
  id:        z.string(),
  imageUrl:  z.string().url(),
  linkUrl:   z.string(),
  isActive:  z.boolean().default(true),
  priority:  z.number().int().nonnegative().default(0),
  endDate:   z.date().optional().nullable(),
});

export const CmsHomeSchema = z.object({
  heroBanners:    z.array(BannerSchema),
  featuredBooks:  z.array(FeaturedBookSchema),
  themeCurations: z.array(ThemeCurationSchema),
  popup:          PopupSchema.optional().nullable(),
  popups:         z.array(PopupSchema).optional().default([]),
  updatedAt:      z.date(),
});

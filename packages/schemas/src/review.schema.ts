import { z } from 'zod';

export const ReviewSchema = z.object({
  reviewId:  z.string(),
  bookIsbn:  z.string(),
  userId:    z.string(),
  userName:  z.string(),
  rating:    z.number().int().min(1).max(5),
  content:   z.string().min(10).max(1000),
  createdAt: z.date(),
});
export type Review = z.infer<typeof ReviewSchema>;

import { z } from 'zod';

export const ArticleTypeEnum = z.enum([
  'author_interview', 'bookstore_story', 'publisher_story'
]);

export const ArticleSchema = z.object({
  articleId:     z.string(),
  slug:          z.string().min(1),
  type:          ArticleTypeEnum,
  title:         z.string().min(1),
  content:       z.string(),
  thumbnailUrl:  z.string().url(),
  isPublished:   z.boolean().default(false),
  createdAt:     z.date(),
  updatedAt:     z.date(),
});
export type Article = z.infer<typeof ArticleSchema>;

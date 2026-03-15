import { z } from 'zod';

export const EventTypeEnum = z.enum([
  'book_concert', 'author_talk', 'book_club'
]);

export const EventSchema = z.object({
  eventId:          z.string(),
  title:            z.string().min(1),
  type:             EventTypeEnum,
  description:      z.string(),
  imageUrl:         z.string().url(),
  date:             z.date(),
  location:         z.string(),
  capacity:         z.number().int().positive(),
  registeredCount:  z.number().int().nonnegative().default(0),
  isActive:         z.boolean().default(true),
  createdAt:        z.date(),
});
export type Event = z.infer<typeof EventSchema>;

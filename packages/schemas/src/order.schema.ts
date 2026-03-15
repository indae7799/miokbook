import { z } from 'zod';

export const OrderStatusEnum = z.enum([
  'pending', 'paid', 'cancelled', 'failed',
  'cancelled_by_customer',
  'return_requested', 'return_completed'
]);

export const ShippingStatusEnum = z.enum(['ready', 'shipped', 'delivered']);

export const OrderItemSchema = z.object({
  isbn:       z.string(),
  slug:       z.string(),
  title:      z.string(),
  coverImage: z.string().url(),
  quantity:   z.number().int().positive(),
  unitPrice:  z.number().int().positive(),
});

export const ShippingAddressSchema = z.object({
  name:          z.string().min(1),
  phone:         z.string().regex(/^01[0-9]{8,9}$/),
  zipCode:       z.string().regex(/^\d{5}$/),
  address:       z.string().min(1),
  detailAddress: z.string(),
});

export const OrderSchema = z.object({
  orderId:         z.string(),
  userId:          z.string(),
  status:          OrderStatusEnum,
  shippingStatus:  ShippingStatusEnum,
  items:           z.array(OrderItemSchema).min(1),
  totalPrice:      z.number().int().nonnegative(),
  shippingFee:     z.number().int().nonnegative(),
  shippingAddress: ShippingAddressSchema,
  paymentKey:      z.string().nullable(),
  createdAt:       z.date(),
  expiresAt:       z.date(),
  paidAt:          z.date().nullable(),
  cancelledAt:     z.date().nullable(),
  deliveredAt:     z.date().nullable(), // 반품 7일 계산 기준
  returnStatus:    z.enum(['none', 'requested', 'completed']).default('none'),
  returnReason:    z.string().nullable(),
});
export type Order = z.infer<typeof OrderSchema>;

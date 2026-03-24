import { z } from 'zod';

export const OrderStatusEnum = z.enum([
  'pending', 'paid', 'cancelled', 'failed',
  'cancelled_by_customer',
  'return_requested', 'return_completed',
  'exchange_requested', 'exchange_completed'
]);

export const ShippingStatusEnum = z.enum(['ready', 'shipped', 'delivered']);

export const OrderItemSchema = z.object({
  isbn:       z.string(),
  slug:       z.string(),
  title:      z.string(),
  coverImage: z.string(), // url() 제거 — 표지 없는 도서(빈 문자열)도 허용
  quantity:   z.number().int().positive(),
  unitPrice:  z.number().int().positive(),
});

export const ShippingAddressSchema = z.object({
  name:          z.string().min(1),
  phone:         z.string().regex(/^01[0-9]{8,9}$/),
  zipCode:       z.string().regex(/^\d{5}$/).optional().or(z.literal('')),
  address:       z.string().min(1),
  detailAddress: z.string(),
  deliveryMemo:  z.string().optional(),
  promotionCode: z.string().optional(),
  promotionLabel:z.string().optional(),
  promotionDiscount: z.number().int().nonnegative().optional(),
});

export const OrderSchema = z.object({
  orderId:         z.string(),
  userId:          z.string(),
  status:          OrderStatusEnum,
  shippingStatus:  ShippingStatusEnum,
  items:           z.array(OrderItemSchema).min(1),
  totalPrice:      z.number().int().nonnegative(),
  shippingFee:     z.number().int().nonnegative(),
  pointsUsed:      z.number().int().nonnegative().default(0),
  pointsEarned:    z.number().int().nonnegative().default(0),
  payableAmount:   z.number().int().nonnegative().default(0),
  deliveryMemo:    z.string().default(''),
  promotionCode:   z.string().nullable().optional(),
  promotionLabel:  z.string().nullable().optional(),
  promotionDiscount: z.number().int().nonnegative().default(0),
  shippingAddress: ShippingAddressSchema,
  paymentKey:      z.string().nullable(),
  createdAt:       z.coerce.date(), // Supabase는 ISO 문자열 반환 → coerce로 자동 변환
  expiresAt:       z.coerce.date(),
  paidAt:          z.coerce.date().nullable(),
  cancelledAt:     z.coerce.date().nullable(),
  deliveredAt:     z.coerce.date().nullable(), // 반품 7일 계산 기준
  returnStatus:    z.enum(['none', 'requested', 'completed']).default('none'),
  returnReason:    z.string().nullable(),
});
export type Order = z.infer<typeof OrderSchema>;

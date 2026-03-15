import { z } from 'zod';

const ShippingAddressSchema = z.object({
  name:          z.string().min(1),
  phone:         z.string().regex(/^01[0-9]{8,9}$/),
  zipCode:       z.string().regex(/^\d{5}$/),
  address:       z.string().min(1),
  detailAddress: z.string(),
});

export const UserSchema = z.object({
  uid:       z.string(),
  email:     z.string().email(),
  name:      z.string().min(1),
  phone:     z.string(),
  role:      z.enum(['customer', 'admin']),
  addresses: z.array(ShippingAddressSchema).default([]),
  createdAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

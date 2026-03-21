import { describe, expect, it, vi } from 'vitest';

vi.mock('date-fns', () => ({
  addBusinessDays: (date: Date, businessDays: number) => {
    const result = new Date(date);
    let remaining = businessDays;
    while (remaining > 0) {
      result.setUTCDate(result.getUTCDate() + 1);
      const day = result.getUTCDay();
      if (day !== 0 && day !== 6) remaining -= 1;
    }
    return result;
  },
}));

describe('shipping utils', () => {
  it('charges shipping below the free threshold', async () => {
    const { calculateShippingFee, SHIPPING_FEE, SHIPPING_FREE_THRESHOLD } = await import('../../packages/utils/src/shipping');
    expect(calculateShippingFee(SHIPPING_FREE_THRESHOLD - 1)).toBe(SHIPPING_FEE);
  });

  it('waives shipping at or above the free threshold', async () => {
    const { calculateShippingFee, SHIPPING_FREE_THRESHOLD } = await import('../../packages/utils/src/shipping');
    expect(calculateShippingFee(SHIPPING_FREE_THRESHOLD)).toBe(0);
    expect(calculateShippingFee(SHIPPING_FREE_THRESHOLD + 5000)).toBe(0);
  });

  it('returns a delivery date three business days later', async () => {
    const { calculateDeliveryDate } = await import('../../packages/utils/src/shipping');
    const orderDate = new Date('2026-03-13T09:00:00.000Z');
    expect(calculateDeliveryDate(orderDate).toISOString()).toBe('2026-03-18T09:00:00.000Z');
  });
});

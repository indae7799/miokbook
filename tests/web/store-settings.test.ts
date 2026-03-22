import { describe, expect, it } from 'vitest';

describe('store settings helpers', () => {
  it('falls back to defaults for invalid values', async () => {
    const { sanitizeStoreSettings, DEFAULT_STORE_SETTINGS } = await import('../../apps/web/src/lib/store-settings');

    const result = sanitizeStoreSettings({
      shippingFee: -1,
      freeShippingThreshold: 'abc',
      returnPeriodDays: 99,
      storeName: '테스트 서점',
    });

    expect(result.storeName).toBe('테스트 서점');
    expect(result.shippingFee).toBe(DEFAULT_STORE_SETTINGS.shippingFee);
    expect(result.freeShippingThreshold).toBe(DEFAULT_STORE_SETTINGS.freeShippingThreshold);
    expect(result.returnPeriodDays).toBe(DEFAULT_STORE_SETTINGS.returnPeriodDays);
  });

  it('uses runtime settings to calculate shipping fee', async () => {
    const { calculateShippingFee } = await import('../../apps/web/src/lib/store-settings');

    expect(calculateShippingFee(11999, { shippingFee: 4000, freeShippingThreshold: 12000 })).toBe(4000);
    expect(calculateShippingFee(12000, { shippingFee: 4000, freeShippingThreshold: 12000 })).toBe(0);
  });
});

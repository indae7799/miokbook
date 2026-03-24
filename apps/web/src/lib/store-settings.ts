export interface StoreSettings {
  storeName: string;
  ceoName: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  shippingFee: number;
  freeShippingThreshold: number;
  operatingHours: string;
  returnPeriodDays: number;
  noticeText: string;
}

export const STORE_SETTINGS_KEY = 'store';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: '미옥서원',
  ceoName: '',
  businessNumber: '',
  address: '',
  phone: '',
  email: '',
  shippingFee: 2500,
  freeShippingThreshold: 15000,
  operatingHours: '매일 09:00-18:00',
  returnPeriodDays: 7,
  noticeText: '',
};

export function sanitizeStoreSettings(value: unknown): StoreSettings {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

  return {
    storeName: typeof raw.storeName === 'string' ? raw.storeName : DEFAULT_STORE_SETTINGS.storeName,
    ceoName: typeof raw.ceoName === 'string' ? raw.ceoName : DEFAULT_STORE_SETTINGS.ceoName,
    businessNumber: typeof raw.businessNumber === 'string' ? raw.businessNumber : DEFAULT_STORE_SETTINGS.businessNumber,
    address: typeof raw.address === 'string' ? raw.address : DEFAULT_STORE_SETTINGS.address,
    phone: typeof raw.phone === 'string' ? raw.phone : DEFAULT_STORE_SETTINGS.phone,
    email: typeof raw.email === 'string' ? raw.email : DEFAULT_STORE_SETTINGS.email,
    shippingFee: normalizeNonNegativeInt(raw.shippingFee, DEFAULT_STORE_SETTINGS.shippingFee),
    freeShippingThreshold: normalizeNonNegativeInt(raw.freeShippingThreshold, DEFAULT_STORE_SETTINGS.freeShippingThreshold),
    operatingHours: typeof raw.operatingHours === 'string' ? raw.operatingHours : DEFAULT_STORE_SETTINGS.operatingHours,
    returnPeriodDays: normalizeReturnPeriod(raw.returnPeriodDays, DEFAULT_STORE_SETTINGS.returnPeriodDays),
    noticeText: typeof raw.noticeText === 'string' ? raw.noticeText : DEFAULT_STORE_SETTINGS.noticeText,
  };
}

export function calculateShippingFee(totalPrice: number, settings: Pick<StoreSettings, 'shippingFee' | 'freeShippingThreshold'>): number {
  return totalPrice >= settings.freeShippingThreshold ? 0 : settings.shippingFee;
}

function normalizeNonNegativeInt(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : fallback;
}

function normalizeReturnPeriod(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) && num >= 1 && num <= 30 ? Math.floor(num) : fallback;
}

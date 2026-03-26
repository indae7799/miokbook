import { portonePaymentProvider } from '@/lib/payments/providers/portone';
import { tossPaymentProvider } from '@/lib/payments/providers/toss';
import type { PaymentProvider, PaymentProviderAdapter } from '@/lib/payments/types';

const PROVIDERS: Record<PaymentProvider, PaymentProviderAdapter> = {
  toss: tossPaymentProvider,
  portone: portonePaymentProvider,
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

function normalizeProvider(value: unknown): PaymentProvider | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'toss' || normalized === 'tosspayments') return 'toss';
  if (normalized === 'portone' || normalized === 'inicis' || normalized === 'kg_inicis' || normalized === 'kg-inicis') return 'portone';
  return null;
}

export function resolvePaymentProvider(orderLike?: unknown, requestedProvider?: unknown): PaymentProvider {
  const direct = normalizeProvider(requestedProvider);
  if (direct) return direct;

  const orderRecord = asRecord(orderLike);
  const shippingAddress = asRecord(orderRecord?.shipping_address);
  const candidates = [
    orderRecord?.payment_provider,
    orderRecord?.pg_provider,
    shippingAddress?.paymentProvider,
    shippingAddress?.pgProvider,
  ];

  for (const candidate of candidates) {
    const provider = normalizeProvider(candidate);
    if (provider) return provider;
  }

  return 'toss';
}

export function getPaymentProviderAdapter(provider: PaymentProvider): PaymentProviderAdapter {
  return PROVIDERS[provider];
}

export function resolvePaymentReference(body: UnknownRecord, provider: PaymentProvider): string | null {
  const candidates =
    provider === 'portone'
      ? [body.paymentReference, body.impUid, body.imp_uid, body.paymentId, body.paymentKey]
      : [body.paymentReference, body.paymentKey];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function mergeOrderPaymentMetadata(
  currentShippingAddress: unknown,
  metadata: { provider: PaymentProvider; paymentReference: string },
): Record<string, unknown> {
  const shippingAddress = asRecord(currentShippingAddress) ?? {};
  return {
    ...shippingAddress,
    paymentProvider: metadata.provider,
    paymentReference: metadata.paymentReference,
  };
}

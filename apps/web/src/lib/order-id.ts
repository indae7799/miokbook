const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function generateDisplayOrderId(date = new Date()): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const ymd = kst.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `MO-${ymd}-${suffix}`;
}

export function attachDisplayOrderId(
  shippingAddress: Record<string, unknown> | null | undefined,
  displayOrderId: string,
): Record<string, unknown> {
  return {
    ...(shippingAddress ?? {}),
    displayOrderId,
  };
}

export function resolveDisplayOrderId(row: unknown): string {
  const record = asRecord(row);
  if (!record) return '';

  const directDisplayOrderId = typeof record.display_order_id === 'string'
    ? record.display_order_id.trim()
    : typeof record.displayOrderId === 'string'
      ? record.displayOrderId.trim()
      : '';
  if (directDisplayOrderId) return directDisplayOrderId;

  const shippingAddress = asRecord(record.shipping_address ?? record.shippingAddress);
  const nestedDisplayOrderId = typeof shippingAddress?.displayOrderId === 'string'
    ? shippingAddress.displayOrderId.trim()
    : '';
  if (nestedDisplayOrderId) return nestedDisplayOrderId;

  const fallbackOrderId = typeof record.order_id === 'string'
    ? record.order_id.trim()
    : typeof record.orderId === 'string'
      ? record.orderId.trim()
      : '';
  return fallbackOrderId;
}

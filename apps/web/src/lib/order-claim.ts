export interface ClaimableOrderLike {
  status: string;
  shippingStatus: string;
  deliveredAt: string | null;
  returnStatus?: string | null;
}

const EXCHANGE_PERIOD_DAYS = 7;

function isWithinDays(dateValue: string | null, days: number): boolean {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function canRequestReturn(order: ClaimableOrderLike, returnPeriodDays: number): boolean {
  return (
    order.status === 'paid' &&
    order.shippingStatus === 'delivered' &&
    order.returnStatus !== 'requested' &&
    order.returnStatus !== 'completed' &&
    !String(order.status).startsWith('exchange_') &&
    isWithinDays(order.deliveredAt, returnPeriodDays)
  );
}

export function canRequestExchange(order: ClaimableOrderLike): boolean {
  return (
    order.status === 'paid' &&
    order.shippingStatus === 'delivered' &&
    order.returnStatus !== 'requested' &&
    order.returnStatus !== 'completed' &&
    isWithinDays(order.deliveredAt, EXCHANGE_PERIOD_DAYS)
  );
}

export function buildClaimItemSummary(
  items: Array<{ title?: string; quantity?: number }>,
  selectedIndexes: number[],
): string {
  if (selectedIndexes.length === 0) return '선택 상품 없음';
  return selectedIndexes
    .map((index) => {
      const item = items[index];
      if (!item) return null;
      const title = item.title?.trim() || `상품 ${index + 1}`;
      const quantity = item.quantity ?? 1;
      return `${title} x ${quantity}`;
    })
    .filter((value): value is string => Boolean(value))
    .join(', ');
}

export type StoreBookStatus = 'on_sale' | 'out_of_print' | 'coming_soon' | 'old_edition';

const SELLABLE_STATUSES = new Set<StoreBookStatus>(['on_sale']);

export function isStoreBookStatusSellable(status: string | null | undefined): boolean {
  return SELLABLE_STATUSES.has(String(status ?? '').trim() as StoreBookStatus);
}

export function isBookPurchasable(params: {
  status?: string | null;
  available?: number | null;
}): boolean {
  return isStoreBookStatusSellable(params.status) && Number(params.available ?? 0) > 0;
}

export function getBookPurchaseBlockReason(params: {
  status?: string | null;
  available?: number | null;
}): string {
  const status = String(params.status ?? '').trim() as StoreBookStatus | '';
  if (!isStoreBookStatusSellable(status)) {
    if (status === 'out_of_print') return '절판';
    if (status === 'old_edition') return '구판';
    if (status === 'coming_soon') return '예약판매';
    return '구매불가';
  }

  if (Number(params.available ?? 0) <= 0) {
    return '품절';
  }

  return '';
}

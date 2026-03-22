export const MILEAGE_EARN_RATE = 0.05;
export const MILEAGE_MIN_USE = 1000;
export const MILEAGE_MAX_USE_RATIO = 0.5;

export type MileageLedgerKind = 'earn' | 'use' | 'cancel_restore' | 'cancel_revoke';

export function calculateMileageEarn(totalPrice: number): number {
  const base = Math.max(0, Math.floor(Number(totalPrice) || 0));
  return Math.floor(base * MILEAGE_EARN_RATE);
}

export function calculateMaxMileageUse(totalPrice: number, balance: number): number {
  const subtotal = Math.max(0, Math.floor(Number(totalPrice) || 0));
  const currentBalance = Math.max(0, Math.floor(Number(balance) || 0));
  const ratioCap = Math.floor(subtotal * MILEAGE_MAX_USE_RATIO);
  return Math.max(0, Math.min(currentBalance, ratioCap));
}

export function normalizeMileageUse(requested: unknown, totalPrice: number, balance: number): number {
  const requestedPoints = Math.max(0, Math.floor(Number(requested) || 0));
  if (requestedPoints === 0) return 0;
  const capped = Math.min(requestedPoints, calculateMaxMileageUse(totalPrice, balance));
  return capped >= MILEAGE_MIN_USE ? capped : 0;
}


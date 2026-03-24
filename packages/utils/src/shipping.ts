/**
 * PRD Section 12: 배송 정책
 * 15,000원 이상 무료, 미만 3,000원
 * 배송 예정일: 주문일 + 3 영업일 (date-fns addBusinessDays)
 */
import { addBusinessDays } from 'date-fns';

export const SHIPPING_FREE_THRESHOLD = 15000;
export const SHIPPING_FEE = 2500;

const BUSINESS_DAYS_TO_DELIVER = 3;

/**
 * 주문 금액(원) 기준 배송비 계산
 * 15,000원 이상 → 0원, 미만 → 3,000원
 */
export function calculateShippingFee(total: number): number {
  return total >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FEE;
}

/**
 * 주문일 기준 배송 예정일 (주문일 + 3 영업일)
 */
export function calculateDeliveryDate(orderDate: Date): Date {
  return addBusinessDays(orderDate, BUSINESS_DAYS_TO_DELIVER);
}

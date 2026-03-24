export type PromotionCode = 'WELCOME5' | 'BOOKSHIP' | 'SPRINGPOINT';

export type PromotionOption = {
  code: PromotionCode;
  label: string;
  description: string;
};

export const promotionOptions: PromotionOption[] = [
  {
    code: 'WELCOME5',
    label: '신규 회원 5% 혜택',
    description: '상품 금액 기준 5% 할인, 최대 3,000원까지 적용됩니다.',
  },
  {
    code: 'BOOKSHIP',
    label: '무료배송 프로모션',
    description: '배송비가 발생하는 주문에 한해 배송비를 할인합니다.',
  },
  {
    code: 'SPRINGPOINT',
    label: '봄 시즌 더블 적립',
    description: '즉시 할인 대신 적립 혜택 강조용 프로모션입니다.',
  },
];

export function getPromotionOption(code: string | null | undefined): PromotionOption | null {
  return promotionOptions.find((item) => item.code === code) ?? null;
}

export function calculatePromotionDiscount(totalPrice: number, shippingFee: number, code: string | null | undefined): number {
  switch (code) {
    case 'WELCOME5':
      return Math.min(3000, Math.floor(totalPrice * 0.05));
    case 'BOOKSHIP':
      return Math.max(0, shippingFee);
    case 'SPRINGPOINT':
    default:
      return 0;
  }
}

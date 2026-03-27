export const BULK_CONTRACT_VERSION = '2026-03-27.v1';
export const BULK_CONTRACT_TITLE = '도서 납품 및 판매 대행 계약서';

export const BULK_CONTRACT_SUPPLIER = {
  name: '미옥서원',
  representative: '정미옥',
  businessNumber: '687-19-01423',
  address: '서울특별시 강남구 도곡로 77길 3, 1층',
  phone: '02-569-1643',
  email: 'miokbooks@naver.com',
} as const;

export type BulkContractClause = {
  title: string;
  body: string;
};

export const BULK_CONTRACT_CLAUSES: BulkContractClause[] = [
  {
    title: '제1조 (목적)',
    body: '본 계약은 갑이 운영하는 미옥서원과 을이 요청한 단체 도서 구매 거래에 관하여, 도서 공급, 판매 대행, 납품 및 정산에 필요한 권리와 의무를 정함을 목적으로 합니다.',
  },
  {
    title: '제2조 (계약 대상 및 주문 확정)',
    body: '계약 대상 도서의 제목, ISBN, 수량, 공급단가, 배송비, 총액, 희망 납품일은 체결 시점의 견적서와 계약 스냅샷에 따르며, 이후 변경이 필요한 경우 갑과 을이 별도로 합의합니다.',
  },
  {
    title: '제3조 (공급가 및 정산)',
    body: '공급가와 총액은 도서정가제 등 관련 법령을 준수하여 산정하며, 계약 체결 시 확정된 견적 조건을 기준으로 정산합니다. 세금계산서 및 결제 방식은 개별 거래 조건에 따릅니다.',
  },
  {
    title: '제4조 (납품 및 검수)',
    body: '갑은 계약된 일정에 맞춰 도서를 준비하여 납품하고, 을은 납품 완료 후 수량 및 파손 여부를 확인합니다. 납품일 또는 수령지 변경이 필요한 경우 을은 즉시 갑에게 통지해야 합니다.',
  },
  {
    title: '제5조 (취소 및 변경)',
    body: '계약 체결 후 주문 변경 또는 취소가 필요한 경우 상대방과 협의하여 처리합니다. 이미 발주 또는 출고가 진행된 도서에 대해서는 실제 발생한 비용이 반영될 수 있습니다.',
  },
  {
    title: '제6조 (전자계약의 효력)',
    body: '을이 계약 내용 확인 후 전자 서명을 완료하면 본 계약은 전자문서 및 전자거래 기본법 등 관련 법령에 따라 서면 계약과 동일한 효력을 가집니다. 체결 당시의 계약 버전, 본문, 거래 정보, 서명 시각 및 접속 정보는 감사 목적으로 보관됩니다.',
  },
  {
    title: '제7조 (분쟁 해결)',
    body: '본 계약과 관련하여 분쟁이 발생할 경우 갑과 을은 우선 협의하여 해결하며, 협의로 해결되지 않을 경우 갑의 본점 소재지를 관할하는 법원을 전속적 합의관할로 합니다.',
  },
];

export type BulkContractQuoteItemSnapshot = {
  title: string;
  isbn: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type BulkContractQuoteSnapshot = {
  items: BulkContractQuoteItemSnapshot[];
  shippingFee: number;
  totalAmount: number;
  validUntil: string;
  memo: string;
  issuedAt?: string;
};

export type BulkContractOrderSnapshot = {
  orderId: string;
  organization: string;
  contactName: string;
  email: string;
  phone: string;
  deliveryDate: string;
  notes: string;
  createdAt: string | null;
};

export type BulkContractAuditTrail = {
  signedAt: string;
  signerName: string;
  signerIp: string | null;
  signerUserAgent: string | null;
  agreedToElectronicContract: boolean;
  agreedToOrderAndPricing: boolean;
};

export type BulkContractSnapshot = {
  version: string;
  title: string;
  supplier: typeof BULK_CONTRACT_SUPPLIER;
  order: BulkContractOrderSnapshot;
  quote: BulkContractQuoteSnapshot | null;
  clauses: BulkContractClause[];
  createdAt: string;
};

export function buildBulkContractSnapshot(input: {
  order: BulkContractOrderSnapshot;
  quote: BulkContractQuoteSnapshot | null;
}): BulkContractSnapshot {
  return {
    version: BULK_CONTRACT_VERSION,
    title: BULK_CONTRACT_TITLE,
    supplier: BULK_CONTRACT_SUPPLIER,
    order: input.order,
    quote: input.quote,
    clauses: BULK_CONTRACT_CLAUSES,
    createdAt: new Date().toISOString(),
  };
}

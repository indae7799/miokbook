export const BULK_CONTRACT_VERSION = '2026-03-27.v1';
export const BULK_CONTRACT_TITLE = '도서 납품 및 판매 대행 계약서';

export const BULK_CONTRACT_SUPPLIER = {
  name: '미옥서원',
  representative: '이재종',
  businessNumber: '658-85-02648',
  address: '충청남도 보령시 청소면 성당길 72',
  storeAddress: '충청남도 보령시 청소면 성당길 68',
  phone: '041-935-1535',
  email: 'support.miokbook@gmail.com',
  hours: '매일 10:00 - 18:00',
} as const;

export type BulkContractClause = {
  title: string;
  body: string;
};

export const BULK_CONTRACT_CLAUSES: BulkContractClause[] = [
  {
    title: '제1조 (목적)',
    body: '본 계약은 갑이 운영하는 서점에서 을이 운영하거나 관리하는 기관·교육 시설에 필요한 도서를 공급하고, 을은 이에 따른 홍보 및 판매 대행 서비스를 제공함에 있어 필요한 사항을 규정함을 목적으로 합니다.',
  },
  {
    title: '제2조 (도서의 공급 및 판매가)',
    body: '갑은 을에게 도서를 공급함에 있어 출판문화산업 진흥법 등 도서정가제 관련 법령을 준수합니다. 도서의 판매가는 정가 대비 10% 이내의 할인율(90% 공급가)을 적용하는 것을 원칙으로 하며, 이는 법정 허용 범위 내의 정당한 거래로 간주합니다. 배송비 및 기타 부대비용은 상호 협의 하에 결정합니다.',
  },
  {
    title: '제3조 (판매 대행 및 홍보 서비스의 제공)',
    body: '을은 갑을 대신하여 학생, 학부모 또는 기관 이용자에게 해당 도서를 홍보하고, 구매 수량 취합 및 대금 수납 대행 서비스를 제공할 수 있습니다. 을은 도서의 원활한 배부와 보관을 위한 장소를 제공하며, 관련 민원 응대를 지원합니다.',
  },
  {
    title: '제4조 (판매 대행 수수료)',
    body: '갑은 을이 제공하는 제3조의 서비스에 대한 대가로 도서 실판매액(할인가 기준)의 11%(부가세 포함)를 판매 대행 수수료로 지급합니다. 예를 들어 9,000원에 판매된 경우 수수료는 1,000원입니다. 수수료율은 상호 합의 하에 조정할 수 있으며, 별도의 서면 합의가 없는 한 본 계약의 요율을 유지합니다.',
  },
  {
    title: '제5조 (정산 및 계산서 발행)',
    body: '갑은 공급한 도서 전체 금액에 대하여 면세 계산서를 발행합니다. 을은 수령한 수수료에 대하여 과세 세금계산서를 갑에게 발행합니다. 정산은 매월 말일 또는 납품 완료 시점을 기준으로 하며, 갑은 을의 세금계산서 수령 후 7일 이내에 수수료를 지급합니다.',
  },
  {
    title: '제6조 (주문 확정, 변경 및 취소)',
    body: '계약 대상 도서의 제목, ISBN, 수량, 공급단가, 배송비, 총액, 희망 납품일은 체결 시점의 견적서 및 계약 스냅샷에 따릅니다. 계약 체결 후 주문 변경 또는 취소가 필요한 경우 상대방과 협의하여 처리하며, 이미 발주 또는 출고가 진행된 도서에 대해서는 실제 발생한 비용이 반영될 수 있습니다.',
  },
  {
    title: '제7조 (납품, 검수 및 책임 범위)',
    body: '갑은 계약된 일정에 맞춰 도서를 준비하여 납품하고, 을은 납품 완료 후 수량 및 파손 여부를 확인합니다. 납품일 또는 수령지 변경이 필요한 경우 을은 즉시 갑에게 통지해야 합니다. 갑은 출판사 절판, 품절, 배송사고, 천재지변 기타 불가항력으로 인한 지연 또는 미이행에 대해 고의 또는 중대한 과실이 없는 한 책임을 부담하지 않습니다.',
  },
  {
    title: '제8조 (전자계약의 효력 및 보관)',
    body: '을이 계약 내용 확인 후 전자 서명을 완료하면 본 계약은 전자문서 및 전자거래 기본법 등 관련 법령에 따라 서면 계약과 동일한 효력을 가집니다. 체결 당시의 계약 버전, 본문, 거래 정보, 서명 시각 및 접속 정보는 감사 목적으로 보관되며, 해당 도서의 납품 및 정산이 완료될 때까지 유효합니다.',
  },
  {
    title: '제9조 (분쟁 해결)',
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

import type { PaymentProvider } from '@/lib/payments/types';

interface TossPaymentsFactory {
  (clientKey: string): {
    requestPayment: (
      method: string,
      params: { amount: number; orderId: string; orderName: string; successUrl: string; failUrl: string },
    ) => Promise<unknown>;
  };
}

interface PortOneRequestPaymentParams {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: 'CURRENCY_KRW';
  payMethod: 'CARD';
  redirectUrl: string;
  noticeUrls?: string[];
  customData?: string;
}

interface PortOneGlobal {
  requestPayment: (params: PortOneRequestPaymentParams) => Promise<unknown>;
}

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
    PortOne?: PortOneGlobal;
  }
}

export interface ClientPaymentRequestParams {
  provider: PaymentProvider;
  orderId: string;
  displayOrderId?: string;
  amount: number;
  orderName: string;
  successUrl: string;
  failUrl: string;
}

function loadScriptOnce(srcPattern: string, src: string, errorMessage: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (document.querySelector(`script[src*="${srcPattern}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(errorMessage));
    document.head.appendChild(script);
  });
}

export function getClientPaymentProvider(): PaymentProvider {
  const preferred = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER?.trim().toLowerCase();
  if (preferred === 'portone') return 'portone';
  if (preferred === 'toss') return 'toss';

  const hasPortone = Boolean(process.env.NEXT_PUBLIC_PORTONE_STORE_ID && process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY);
  return hasPortone ? 'portone' : 'toss';
}

async function requestTossPayment(params: ClientPaymentRequestParams) {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) throw new Error('토스 결제 설정이 없습니다.');

  await loadScriptOnce('tosspayments.com', 'https://js.tosspayments.com/v1/payment', 'Toss script load failed');
  const tossPaymentsFactory = window.TossPayments;
  if (!tossPaymentsFactory) throw new Error('토스 결제창을 불러오지 못했습니다.');

  const tossPayments = tossPaymentsFactory(clientKey);
  return tossPayments.requestPayment('카드', {
    amount: params.amount,
    orderId: params.orderId,
    orderName: params.orderName.slice(0, 100),
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
}

async function requestPortOnePayment(params: ClientPaymentRequestParams) {
  const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
  const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
  if (!storeId || !channelKey) {
    throw new Error('포트원 결제 설정이 없습니다.');
  }

  await loadScriptOnce('cdn.portone.io', 'https://cdn.portone.io/v2/browser-sdk.js', 'PortOne script load failed');
  const portOne = window.PortOne;
  if (!portOne?.requestPayment) {
    throw new Error('포트원 결제창을 불러오지 못했습니다.');
  }

  return portOne.requestPayment({
    storeId,
    channelKey,
    paymentId: params.orderId,
    orderName: params.orderName.slice(0, 100),
    totalAmount: params.amount,
    currency: 'CURRENCY_KRW',
    payMethod: 'CARD',
    redirectUrl: params.successUrl,
    customData: JSON.stringify({
      failUrl: params.failUrl,
      orderId: params.orderId,
    }),
  });
}

export async function requestClientPayment(params: ClientPaymentRequestParams) {
  if (params.provider === 'portone') {
    return requestPortOnePayment(params);
  }
  return requestTossPayment(params);
}

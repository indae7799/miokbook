export type PaymentProvider = 'toss' | 'portone';

export interface ConfirmPaymentParams {
  orderId: string;
  amount: number;
  paymentReference: string;
  rawRequest?: Record<string, unknown>;
}

export interface ConfirmPaymentResult {
  ok: boolean;
  approvedAmount?: number;
  externalPaymentId?: string;
  raw?: unknown;
  errorCode?: string;
}

export interface CancelPaymentParams {
  paymentReference: string;
  reason: string;
  rawRequest?: Record<string, unknown>;
}

export interface CancelPaymentResult {
  ok: boolean;
  raw?: unknown;
  errorCode?: string;
}

export interface PaymentProviderAdapter {
  provider: PaymentProvider;
  confirmPayment(params: ConfirmPaymentParams): Promise<ConfirmPaymentResult>;
  cancelPayment(params: CancelPaymentParams): Promise<CancelPaymentResult>;
}

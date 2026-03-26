import type { CancelPaymentParams, CancelPaymentResult, ConfirmPaymentParams, ConfirmPaymentResult, PaymentProviderAdapter } from '@/lib/payments/types';

const PORTONE_API_BASE = 'https://api.iamport.kr';

interface PortOneTokenResponse {
  code: number;
  message: string | null;
  response?: {
    access_token?: string;
  };
}

interface PortOnePaymentResponse {
  code: number;
  message: string | null;
  response?: {
    imp_uid?: string;
    merchant_uid?: string;
    amount?: number;
    status?: string;
    cancel_amount?: number;
  };
}

function getPortOneCredentials() {
  const apiKey = process.env.PORTONE_REST_API_KEY;
  const apiSecret = process.env.PORTONE_REST_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error('PORTONE_NOT_CONFIGURED');
  }
  return { apiKey, apiSecret };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const { apiKey, apiSecret } = getPortOneCredentials();
  const response = await fetch(`${PORTONE_API_BASE}/users/getToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imp_key: apiKey,
      imp_secret: apiSecret,
    }),
  });

  const data = (await response.json().catch(() => null)) as PortOneTokenResponse | null;
  const token = data?.response?.access_token;
  if (!response.ok || data?.code !== 0 || !token) {
    throw new Error('PORTONE_TOKEN_FAILED');
  }

  cachedToken = {
    value: token,
    expiresAt: Date.now() + 29 * 60 * 1000,
  };
  return token;
}

async function getPayment(paymentReference: string): Promise<PortOnePaymentResponse | null> {
  const token = await getAccessToken();
  const response = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(paymentReference)}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return (await response.json().catch(() => null)) as PortOnePaymentResponse | null;
}

async function getPaymentByMerchantUid(orderId: string): Promise<PortOnePaymentResponse | null> {
  const token = await getAccessToken();
  const response = await fetch(`${PORTONE_API_BASE}/payments/find/${encodeURIComponent(orderId)}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return (await response.json().catch(() => null)) as PortOnePaymentResponse | null;
}

export const portonePaymentProvider: PaymentProviderAdapter = {
  provider: 'portone',

  async confirmPayment(params: ConfirmPaymentParams): Promise<ConfirmPaymentResult> {
    try {
      let data = await getPayment(params.paymentReference);
      let payment = data?.response;
      if ((!payment || data?.code !== 0) && params.paymentReference === params.orderId) {
        data = await getPaymentByMerchantUid(params.orderId);
        payment = data?.response;
      }
      const approvedAmount = Number(payment?.amount ?? 0);
      if (data?.code !== 0 || !payment) {
        return { ok: false, errorCode: 'PORTONE_PAYMENT_NOT_FOUND', raw: data };
      }
      if (payment.status !== 'paid') {
        return { ok: false, errorCode: `PORTONE_STATUS_${String(payment.status ?? 'UNKNOWN').toUpperCase()}`, raw: data };
      }
      if (payment.merchant_uid !== params.orderId) {
        return { ok: false, errorCode: 'PORTONE_ORDER_MISMATCH', raw: data };
      }
      if (approvedAmount !== params.amount) {
        return { ok: false, errorCode: 'AMOUNT_MISMATCH', raw: data };
      }

      return {
        ok: true,
        approvedAmount,
        externalPaymentId: payment.imp_uid ?? params.paymentReference,
        raw: data,
      };
    } catch (error) {
      return {
        ok: false,
        errorCode: error instanceof Error ? error.message : 'PORTONE_CONFIRM_FAILED',
      };
    }
  },

  async cancelPayment(params: CancelPaymentParams): Promise<CancelPaymentResult> {
    try {
      const token = await getAccessToken();
      const response = await fetch(`${PORTONE_API_BASE}/payments/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imp_uid: params.paymentReference,
          reason: params.reason,
        }),
      });

      const data = (await response.json().catch(() => null)) as PortOnePaymentResponse | null;
      if (!response.ok || data?.code !== 0) {
        return { ok: false, raw: data, errorCode: 'PORTONE_CANCEL_FAILED' };
      }
      return { ok: true, raw: data };
    } catch (error) {
      return {
        ok: false,
        errorCode: error instanceof Error ? error.message : 'PORTONE_CANCEL_FAILED',
      };
    }
  },
};

import type { CancelPaymentParams, CancelPaymentResult, ConfirmPaymentParams, ConfirmPaymentResult, PaymentProviderAdapter } from '@/lib/payments/types';

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm';
const TOSS_CANCEL_BASE = 'https://api.tosspayments.com/v1/payments';

function getSecretKey(): string {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new Error('TOSS_NOT_CONFIGURED');
  return key;
}

function buildAuthHeader(): string {
  const secret = getSecretKey();
  return `Basic ${Buffer.from(`${secret}:`, 'utf8').toString('base64')}`;
}

async function parseResponse(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export const tossPaymentProvider: PaymentProviderAdapter = {
  provider: 'toss',

  async confirmPayment(params: ConfirmPaymentParams): Promise<ConfirmPaymentResult> {
    const response = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildAuthHeader(),
      },
      body: JSON.stringify({
        paymentKey: params.paymentReference,
        orderId: params.orderId,
        amount: params.amount,
      }),
    });

    const raw = await parseResponse(response);
    if (!response.ok) {
      return { ok: false, raw, errorCode: 'TOSS_CONFIRM_FAILED' };
    }

    const approvedAmount = Number((raw as { totalAmount?: unknown })?.totalAmount ?? 0);
    if (approvedAmount !== params.amount) {
      return { ok: false, raw, errorCode: 'AMOUNT_MISMATCH' };
    }

    return {
      ok: true,
      raw,
      approvedAmount,
      externalPaymentId: params.paymentReference,
    };
  },

  async cancelPayment(params: CancelPaymentParams): Promise<CancelPaymentResult> {
    const response = await fetch(`${TOSS_CANCEL_BASE}/${encodeURIComponent(params.paymentReference)}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildAuthHeader(),
      },
      body: JSON.stringify({
        cancelReason: params.reason || '고객 요청 취소',
      }),
    });

    const raw = await parseResponse(response);
    if (!response.ok) {
      return { ok: false, raw, errorCode: 'TOSS_CANCEL_FAILED' };
    }

    return { ok: true, raw };
  },
};

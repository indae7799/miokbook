import { appendMileageLedger } from '@/lib/mileage-ledger';
import { calculateMileageEarn } from '@/lib/mileage';
import { supabaseAdmin } from '@/lib/supabase/admin';

type JsonRecord = Record<string, unknown>;

type BulkMileageResult =
  | { status: 'not_configured' | 'not_found' | 'status_ineligible' | 'already_awarded' }
  | { status: 'missing_email' | 'missing_quote' | 'zero_amount' | 'user_not_found'; amount: number; email?: string | null }
  | { status: 'awarded'; amount: number; userId: string; email: string };

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function getBooksTotal(quote: JsonRecord | null): number {
  if (!quote || !Array.isArray(quote.items)) return 0;
  return quote.items.reduce((sum, item) => {
    const row = asRecord(item);
    return sum + Math.max(0, Number(row?.total ?? 0));
  }, 0);
}

async function persistMileageState(orderId: string, contract: JsonRecord, mileage: JsonRecord) {
  await supabaseAdmin
    .from('bulk_orders')
    .update({
      contract: {
        ...contract,
        mileage,
      },
    })
    .eq('id', orderId);
}

export async function applyBulkOrderMileage(orderId: string): Promise<BulkMileageResult> {
  if (!supabaseAdmin) return { status: 'not_configured' };

  const { data: order, error } = await supabaseAdmin
    .from('bulk_orders')
    .select('id, email, status, quote, contract')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return { status: 'not_found' };
  if (order.status !== 'contracted' && order.status !== 'completed') {
    return { status: 'status_ineligible' };
  }

  const contract = asRecord(order.contract) ?? {};
  const existingMileage = asRecord(contract.mileage) ?? {};
  if (typeof existingMileage.awardedAt === 'string' && existingMileage.awardedAt.trim()) {
    return { status: 'already_awarded' };
  }

  const email = normalizeEmail(order.email);
  const quote = asRecord(order.quote);
  const booksTotal = getBooksTotal(quote);
  const amount = calculateMileageEarn(booksTotal);
  const attemptedAt = new Date().toISOString();

  if (!email) {
    await persistMileageState(order.id, contract, {
      ...existingMileage,
      status: 'missing_email',
      attemptedAt,
      amount,
    });
    return { status: 'missing_email', amount };
  }

  if (!quote) {
    await persistMileageState(order.id, contract, {
      ...existingMileage,
      status: 'missing_quote',
      attemptedAt,
      email,
      amount,
    });
    return { status: 'missing_quote', amount, email };
  }

  if (amount <= 0) {
    await persistMileageState(order.id, contract, {
      ...existingMileage,
      status: 'zero_amount',
      attemptedAt,
      email,
      amount,
    });
    return { status: 'zero_amount', amount, email };
  }

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('uid, email')
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  if (!profile?.uid) {
    await persistMileageState(order.id, contract, {
      ...existingMileage,
      status: 'user_not_found',
      attemptedAt,
      email,
      amount,
    });
    return { status: 'user_not_found', amount, email };
  }

  await appendMileageLedger({
    userId: String(profile.uid),
    orderId: `bulk:${order.id}`,
    kind: 'earn',
    amount,
  });

  await persistMileageState(order.id, contract, {
    ...existingMileage,
    status: 'awarded',
    attemptedAt,
    awardedAt: attemptedAt,
    email,
    userId: String(profile.uid),
    amount,
  });

  return {
    status: 'awarded',
    amount,
    userId: String(profile.uid),
    email,
  };
}

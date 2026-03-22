import { supabaseAdmin } from '@/lib/supabase/admin';
import type { MileageLedgerKind } from '@/lib/mileage';

export async function appendMileageLedger(params: {
  userId: string;
  orderId: string;
  kind: MileageLedgerKind;
  amount: number;
}) {
  const amount = Math.floor(Number(params.amount) || 0);
  if (!params.userId || !params.orderId || amount <= 0) return;

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('mileage_balance')
    .eq('uid', params.userId)
    .maybeSingle();

  const currentBalance = Math.max(0, Number(profile?.mileage_balance ?? 0));
  const nextBalance =
    params.kind === 'earn' || params.kind === 'cancel_restore'
      ? currentBalance + amount
      : Math.max(0, currentBalance - amount);

  await supabaseAdmin
    .from('user_profiles')
    .upsert(
      {
        uid: params.userId,
        mileage_balance: nextBalance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'uid' }
    );

  await supabaseAdmin.from('mileage_ledger').insert({
    user_id: params.userId,
    order_id: params.orderId,
    kind: params.kind,
    amount,
    balance_after: nextBalance,
  });
}


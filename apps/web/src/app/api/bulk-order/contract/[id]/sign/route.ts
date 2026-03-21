import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body as { name?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: '서명자 이름이 필요합니다.' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('bulk_orders')
      .select('contract')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      console.error('[bulk-order/contract/sign PATCH] existing', existingError);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const contract =
      existing.contract && typeof existing.contract === 'object' && !Array.isArray(existing.contract)
        ? (existing.contract as Record<string, unknown>)
        : {};

    if (contract.signedByEul === true) {
      return NextResponse.json({ error: '이미 서명된 계약서입니다.' }, { status: 409 });
    }

    const { error } = await supabaseAdmin
      .from('bulk_orders')
      .update({
        contract: {
          ...contract,
          signedByEul: true,
          signedAtEul: new Date().toISOString(),
          eulName: name.trim(),
        },
        status: 'contracted',
      })
      .eq('id', id);

    if (error) {
      console.error('[bulk-order/contract/sign PATCH] update', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[bulk-order/contract/sign PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

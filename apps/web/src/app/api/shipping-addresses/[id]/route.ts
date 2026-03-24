import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idToken = request.headers.get('authorization')?.slice(7);
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);

    const { error } = await supabaseAdmin
      .from('user_shipping_addresses')
      .delete()
      .eq('id', params.id)
      .eq('user_id', decoded.uid);

    if (error) {
      console.error('[shipping-addresses DELETE]', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[shipping-addresses DELETE]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idToken = request.headers.get('authorization')?.slice(7);
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({})) as {
      isDefault?: boolean;
      label?: string;
      name?: string;
      phone?: string;
      zipCode?: string;
      address?: string;
      detailAddress?: string;
    };

    // 기본 배송지로 변경 시 기존 기본 배송지 해제
    if (body.isDefault) {
      await supabaseAdmin
        .from('user_shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', decoded.uid)
        .eq('is_default', true);
    }

    const updatePayload: Record<string, unknown> = {};
    if (body.isDefault !== undefined) updatePayload.is_default = body.isDefault;
    if (body.label !== undefined) updatePayload.label = body.label || null;
    if (body.name !== undefined) updatePayload.name = body.name;
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.zipCode !== undefined) updatePayload.zip_code = body.zipCode;
    if (body.address !== undefined) updatePayload.address = body.address;
    if (body.detailAddress !== undefined) updatePayload.detail_address = body.detailAddress || null;

    const { data, error } = await supabaseAdmin
      .from('user_shipping_addresses')
      .update(updatePayload)
      .eq('id', params.id)
      .eq('user_id', decoded.uid)
      .select()
      .single();

    if (error) {
      console.error('[shipping-addresses PATCH]', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('[shipping-addresses PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

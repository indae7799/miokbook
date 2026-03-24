import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const idToken = request.headers.get('authorization')?.slice(7);
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);

    const { data, error } = await supabaseAdmin
      .from('user_shipping_addresses')
      .select('*')
      .eq('user_id', decoded.uid)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[shipping-addresses GET]', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error('[shipping-addresses GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const idToken = request.headers.get('authorization')?.slice(7);
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({})) as {
      label?: string;
      name: string;
      phone: string;
      zipCode: string;
      address: string;
      detailAddress?: string;
      isDefault?: boolean;
    };

    if (!body.name || !body.phone || !body.zipCode || !body.address) {
      return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
    }

    // 기본 배송지로 설정 시 기존 기본 배송지 해제
    if (body.isDefault) {
      await supabaseAdmin
        .from('user_shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', decoded.uid)
        .eq('is_default', true);
    }

    const { data, error } = await supabaseAdmin
      .from('user_shipping_addresses')
      .insert({
        user_id: decoded.uid,
        label: body.label || null,
        name: body.name,
        phone: body.phone,
        zip_code: body.zipCode,
        address: body.address,
        detail_address: body.detailAddress || null,
        is_default: body.isDefault ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('[shipping-addresses POST]', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error('[shipping-addresses POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  DEFAULT_STORE_SETTINGS,
  sanitizeStoreSettings,
  STORE_SETTINGS_KEY,
} from '@/lib/store-settings';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: Request) {
  const idToken = request.headers.get('authorization')?.startsWith('Bearer ')
    ? request.headers.get('authorization')!.slice(7)
    : null;
  if (!idToken || !adminAuth) return { ok: false as const, status: 401 };
  const decoded = await adminAuth.verifyIdToken(idToken);
  if ((decoded as { role?: string }).role !== 'admin') return { ok: false as const, status: 403 };
  return { ok: true as const };
}

export async function GET(request: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

    const auth = await verifyAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status: auth.status });
    }

    const { data, error } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', STORE_SETTINGS_KEY)
      .maybeSingle();

    if (error) {
      console.error('[admin/settings GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json(sanitizeStoreSettings(data?.value));
  } catch (e) {
    console.error('[admin/settings GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

    const auth = await verifyAdmin(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN' }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const allowed = ['storeName', 'ceoName', 'businessNumber', 'address', 'phone', 'email', 'shippingFee', 'freeShippingThreshold', 'operatingHours', 'returnPeriodDays', 'noticeText'];
    const nextValue: Record<string, unknown> = {};

    for (const key of allowed) {
      if (key in body) nextValue[key] = body[key];
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', STORE_SETTINGS_KEY)
      .maybeSingle();

    if (existingError) {
      console.error('[admin/settings PATCH] existing settings load failed', existingError);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const mergedValue = sanitizeStoreSettings({
      ...DEFAULT_STORE_SETTINGS,
      ...((existing?.value && typeof existing.value === 'object' && !Array.isArray(existing.value))
        ? existing.value as Record<string, unknown>
        : {}),
      ...nextValue,
    });

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(
        {
          key: STORE_SETTINGS_KEY,
          value: mergedValue,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('[admin/settings PATCH] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[admin/settings PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

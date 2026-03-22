import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('display_name, email, phone')
      .eq('uid', decoded.uid)
      .maybeSingle();

    if (error) {
      console.error('[auth/profile GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({
      displayName: data?.display_name ?? decoded.name ?? '',
      email: data?.email ?? decoded.email ?? '',
      phone: data?.phone ?? '',
    });
  } catch (e) {
    console.error('[auth/profile GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const body = await request.json().catch(() => ({})) as {
      displayName?: string;
      phone?: string;
      email?: string;
    };

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          uid: decoded.uid,
          display_name: body.displayName ?? decoded.name ?? null,
          email: body.email ?? decoded.email ?? null,
          phone: body.phone ?? null,
          role: 'user',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'uid' }
      );

    if (error) {
      console.error('[auth/profile POST] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[auth/profile POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

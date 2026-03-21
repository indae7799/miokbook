import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { id: eventId } = await params;
    const { data, error } = await supabaseAdmin
      .from('event_registrations')
      .select('registration_id, event_id, event_title, user_id, user_name, user_email, phone, address, status, cancel_reason, created_at, cancelled_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[admin/events/[id]/registrations GET] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json(
      (data ?? []).map((row) => ({
        registrationId: row.registration_id,
        eventId: row.event_id,
        eventTitle: row.event_title ?? '',
        userId: row.user_id,
        userName: row.user_name ?? '',
        userEmail: row.user_email ?? '',
        phone: row.phone ?? '',
        address: row.address ?? '',
        status: row.status ?? 'registered',
        cancelReason: row.cancel_reason ?? '',
        createdAt: row.created_at ?? null,
        cancelledAt: row.cancelled_at ?? null,
      }))
    );
  } catch (e) {
    console.error('[admin/events/[id]/registrations GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { invalidate } from '@/lib/firestore-cache';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await request.json().catch(() => ({}));
    const registrationId = typeof body.registrationId === 'string' ? body.registrationId.trim() : '';
    const cancelReason = typeof body.cancelReason === 'string' ? body.cancelReason.trim() : '';
    if (!registrationId) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    if (cancelReason.length > 300) return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });

    const { data: registration, error } = await supabaseAdmin
      .from('event_registrations')
      .select('*')
      .eq('registration_id', registrationId)
      .maybeSingle();

    if (error) throw error;
    if (!registration) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    if (registration.user_id !== uid) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    if (registration.status !== 'registered') return NextResponse.json({ error: 'INVALID_STATE' }, { status: 400 });

    const now = new Date().toISOString();
    const { error: regUpdateError } = await supabaseAdmin
      .from('event_registrations')
      .update({
        status: 'cancelled',
        cancel_reason: cancelReason,
        cancelled_at: now,
        updated_at: now,
      })
      .eq('registration_id', registrationId);
    if (regUpdateError) throw regUpdateError;

    if (registration.event_id) {
      const { data: eventRow, error: eventReadError } = await supabaseAdmin
        .from('events')
        .select('registered_count')
        .eq('event_id', registration.event_id)
        .maybeSingle();
      if (eventReadError) throw eventReadError;
      if (eventRow) {
        const { error: eventUpdateError } = await supabaseAdmin
          .from('events')
          .update({
            registered_count: Math.max(0, Number(eventRow.registered_count ?? 0) - 1),
            updated_at: now,
          })
          .eq('event_id', registration.event_id);
        if (eventUpdateError) throw eventUpdateError;
      }
    }

    invalidate('events');
    invalidate('event');

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[events/cancel POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

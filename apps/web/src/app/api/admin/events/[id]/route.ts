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

    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('event_id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      eventId: data.event_id,
      title: data.title ?? '',
      type: data.type ?? '',
      description: data.description ?? '',
      imageUrl: data.image_url ?? '',
      date: data.date ?? null,
      location: data.location ?? '',
      capacity: Number(data.capacity ?? 0),
      registeredCount: Number(data.registered_count ?? 0),
      isActive: Boolean(data.is_active),
      createdAt: data.created_at ?? null,
      updatedAt: data.updated_at ?? null,
    });
  } catch (e) {
    console.error('[admin/events/[id] GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function PATCH(
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

    const { id } = await params;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('events')
      .select('event_id')
      .eq('event_id', id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.title === 'string' && body.title.trim()) updates.title = body.title.trim();
    if (['book_concert', 'author_talk', 'book_club'].includes(body.type)) updates.type = body.type;
    if (typeof body.description === 'string') updates.description = body.description;
    if (typeof body.imageUrl === 'string' && body.imageUrl.trim()) updates.image_url = body.imageUrl.trim();
    if (typeof body.location === 'string') updates.location = body.location.trim();
    if (typeof body.capacity === 'number' && body.capacity >= 1) updates.capacity = body.capacity;
    if (typeof body.isActive === 'boolean') updates.is_active = body.isActive;
    if (typeof body.date === 'string' && body.date) {
      const d = new Date(body.date);
      if (!Number.isNaN(d.getTime())) updates.date = d.toISOString();
    }

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('events').update(updates).eq('event_id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/events/[id] PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function DELETE(
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

    const { id } = await params;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('events')
      .select('event_id')
      .eq('event_id', id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const { error } = await supabaseAdmin.from('events').delete().eq('event_id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[admin/events/[id] DELETE]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

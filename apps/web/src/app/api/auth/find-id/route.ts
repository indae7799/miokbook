import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const attempts = new Map<string, number[]>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > RATE_LIMIT;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = Math.max(2, Math.ceil(local.length / 2));
  return `${local.slice(0, visible)}${'*'.repeat(local.length - visible)}@${domain}`;
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone')?.replace(/\D/g, '') ?? '';

    if (!phone || phone.length < 10) {
      return NextResponse.json({ error: 'INVALID_PHONE' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('email, phone')
      .eq('phone', phone)
      .maybeSingle();

    if (error) {
      console.error('[api/auth/find-id]', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    if (!data?.email) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ email: maskEmail(data.email) });
  } catch (e) {
    console.error('[api/auth/find-id]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { invalidateStoreBookListsAndHome } from '@/lib/invalidate-store-book-lists';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.INTERNAL_REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 });
  }

  const auth = request.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token !== secret) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  invalidateStoreBookListsAndHome();
  return NextResponse.json({ ok: true });
}

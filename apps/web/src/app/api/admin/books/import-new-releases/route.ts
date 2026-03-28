import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { importNewReleaseBooks } from '@/lib/new-release-import';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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

    const result = await importNewReleaseBooks();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[admin/books/import-new-releases]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

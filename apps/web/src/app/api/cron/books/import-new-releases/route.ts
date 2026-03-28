import { NextResponse } from 'next/server';
import { importNewReleaseBooks } from '@/lib/new-release-import';

export const dynamic = 'force-dynamic';

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const result = await importNewReleaseBooks();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[cron/books/import-new-releases]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'INTERNAL_ERROR' },
      { status: 500 },
    );
  }
}

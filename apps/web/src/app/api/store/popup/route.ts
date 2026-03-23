import { NextResponse } from 'next/server';
import { getStorePopups } from '@/lib/store/popups';

export const dynamic = 'force-dynamic';

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
};

export async function GET() {
  try {
    return NextResponse.json(await getStorePopups(), { headers: NO_CACHE });
  } catch {
    return NextResponse.json([], { headers: NO_CACHE });
  }
}

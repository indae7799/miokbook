import { NextResponse } from 'next/server';
import { getStoreSettings } from '@/lib/store-settings.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await getStoreSettings();
  return NextResponse.json(settings);
}

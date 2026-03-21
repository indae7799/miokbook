import { NextResponse } from 'next/server';
import { parseCmsLivePayload } from '@/lib/store/parse-cms-live';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { extractCmsValue } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

const EMPTY = {
  storeHero: null,
  mainBottomLeft: null,
  mainBottomRight: null,
  heroBannersMainHero: [],
};

const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate', Pragma: 'no-cache' };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Supabase timeout (${ms}ms)`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

export async function GET() {
  try {
    const row = await withTimeout(
      (async () => await supabaseAdmin.from('cms').select('value').eq('key', 'home').maybeSingle())(),
      5000,
    );

    if (row.error) throw row.error;

    const raw = extractCmsValue(row.data?.value);
    const payload = parseCmsLivePayload(raw);

    return NextResponse.json(payload, { headers: NO_CACHE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/store/cms-live] Error:', msg);

    return NextResponse.json(
      { ...EMPTY, _error: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500, headers: NO_CACHE },
    );
  }
}

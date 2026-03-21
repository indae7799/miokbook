import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('concerts')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    const concerts = (data ?? [])
      .map((row) => {
        const concert = mapConcertRow(row);
        return {
          id: concert.id,
          title: concert.title,
          slug: concert.slug,
          imageUrl: concert.imageUrl,
          date: concert.date,
          description: concert.description,
          order: concert.order,
        };
      })
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

    return NextResponse.json(concerts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/store/concerts GET]', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

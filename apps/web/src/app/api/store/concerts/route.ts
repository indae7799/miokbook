import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

function parsePriceLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

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
        const effectiveTicketPrice = concert.ticketPrice > 0 ? concert.ticketPrice : parsePriceLabel(concert.feeLabel);
        return {
          id: concert.id,
          title: concert.title,
          slug: concert.slug,
          imageUrl: concert.imageUrl,
          date: concert.date,
          description: concert.description,
          bookingLabel: concert.bookingLabel,
          feeLabel: concert.feeLabel,
          statusBadge: concert.statusBadge,
          ticketPrice: effectiveTicketPrice,
          ticketOpen: concert.ticketOpen || effectiveTicketPrice > 0,
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

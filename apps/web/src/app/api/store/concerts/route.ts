import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapConcertRow } from '@/lib/supabase/mappers';

export const dynamic = 'force-dynamic';

function parsePriceLabel(label: string): number {
  const digits = label.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

function parseDateMs(raw: string | null | undefined): number {
  if (!raw) return Number.POSITIVE_INFINITY;
  const value = new Date(raw).getTime();
  return Number.isNaN(value) ? Number.POSITIVE_INFINITY : value;
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
      .sort((a, b) => {
        const nowMs = Date.now();
        const aMs = parseDateMs(a.date);
        const bMs = parseDateMs(b.date);
        const aUpcoming = Number.isFinite(aMs) && aMs >= nowMs;
        const bUpcoming = Number.isFinite(bMs) && bMs >= nowMs;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        if (aUpcoming && bUpcoming) return aMs - bMs;
        if (Number.isFinite(aMs) && Number.isFinite(bMs)) return bMs - aMs;
        return 0;
      });

    return NextResponse.json(concerts);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[api/store/concerts GET]', msg);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapReviewRow } from '@/lib/supabase/mappers';

export async function GET(
  _request: Request,
  context: { params: Promise<{ isbn: string }> }
) {
  const { isbn } = await context.params;
  if (!/^(978|979)\d{10}$/.test(isbn)) {
    return NextResponse.json({ error: 'Invalid ISBN' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('book_isbn', isbn)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data: (data ?? []).map(mapReviewRow) });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

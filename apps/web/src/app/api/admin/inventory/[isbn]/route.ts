import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { isbn: string } }) {
  try {
    if (!adminAuth || !supabaseAdmin) return NextResponse.json({ error: 'Server not configured' }, { status: 503 });

    const idToken = request.headers.get('authorization')?.startsWith('Bearer ')
      ? request.headers.get('authorization')!.slice(7) : null;
    if (!idToken) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

    const { isbn } = params;
    const body = await request.json().catch(() => ({})) as { stock?: number };

    if (typeof body.stock !== 'number' || body.stock < 0) {
      return NextResponse.json({ error: '유효하지 않은 재고 값입니다.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('inventory')
      .upsert(
        {
          isbn,
          stock: body.stock,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'isbn' }
      );

    if (error) {
      console.error('[admin/inventory/[isbn] PATCH] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ success: true, isbn, stock: body.stock });
  } catch (e) {
    console.error('[admin/inventory/[isbn] PATCH]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface BookItem {
  title: string;
  isbn: string;
  quantity: number;
}

interface InquiryBody {
  organization: string;
  contactName: string;
  phone: string;
  email: string;
  deliveryDate: string;
  books: BookItem[];
  notes?: string;
}

export async function POST(request: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const body: InquiryBody = await request.json();
    const { organization, contactName, phone, email, deliveryDate, books, notes } = body;

    if (!organization?.trim()) return NextResponse.json({ error: '기관명을 입력해 주세요.' }, { status: 400 });
    if (!contactName?.trim()) return NextResponse.json({ error: '담당자 이름을 입력해 주세요.' }, { status: 400 });
    if (!phone?.trim()) return NextResponse.json({ error: '연락처를 입력해 주세요.' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: '이메일을 입력해 주세요.' }, { status: 400 });
    if (!deliveryDate?.trim()) return NextResponse.json({ error: '납품 희망일을 입력해 주세요.' }, { status: 400 });
    if (!books || books.length === 0 || !books.some((book) => book.title?.trim())) {
      return NextResponse.json({ error: '도서를 최소 1권 이상 입력해 주세요.' }, { status: 400 });
    }

    const validBooks = books
      .filter((book) => book.title?.trim())
      .map((book) => ({
        title: book.title.trim(),
        isbn: book.isbn?.trim() ?? '',
        quantity: Math.max(1, Number(book.quantity) || 1),
      }));

    const { data, error } = await supabaseAdmin
      .from('bulk_orders')
      .insert({
        status: 'pending',
        organization: organization.trim(),
        contact_name: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        delivery_date: deliveryDate.trim(),
        books: validBooks,
        notes: notes?.trim() ?? '',
        quote: null,
        contract: null,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[bulk-order/inquiry POST] supabase', error);
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
  } catch (e) {
    console.error('[bulk-order/inquiry POST]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** 도서 단건 조회 (장바구니 가격 등용, 공개) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ isbn: string }> }
) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }
    const { isbn } = await params;
    if (!isbn || !/^978\d{10}$/.test(isbn)) {
      return NextResponse.json({ error: 'Invalid isbn' }, { status: 400 });
    }

    const doc = await adminDb.collection('books').doc(isbn).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const d = doc.data()!;
    return NextResponse.json({
      isbn: doc.id,
      slug: d.slug,
      title: d.title,
      author: d.author,
      coverImage: d.coverImage,
      listPrice: d.listPrice,
      salePrice: d.salePrice,
    });
  } catch (e) {
    console.error('[api/books/[isbn]]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

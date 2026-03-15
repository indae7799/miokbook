import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

/** GET /api/books/[isbn]/reviews — 해당 도서 리뷰 목록 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ isbn: string }> }
) {
  const { isbn } = await context.params;
  if (!/^978\d{10}$/.test(isbn)) {
    return NextResponse.json({ error: 'Invalid ISBN' }, { status: 400 });
  }

  if (!adminDb) {
    return NextResponse.json({ data: [] });
  }

  try {
    const snap = await adminDb
      .collection('reviews')
      .where('bookIsbn', '==', isbn)
      .orderBy('createdAt', 'desc')
      .get();

    const list = snap.docs.map((doc) => {
      const d = doc.data();
      const createdAt = d.createdAt?.toDate?.();
      return {
        reviewId: doc.id,
        bookIsbn: d.bookIsbn,
        userId: d.userId,
        userName: d.userName ?? '',
        rating: Number(d.rating ?? 0),
        content: d.content ?? '',
        createdAt: createdAt ? createdAt.toISOString() : null,
      };
    });

    return NextResponse.json({ data: list });
  } catch {
    return NextResponse.json({ data: [] });
  }
}

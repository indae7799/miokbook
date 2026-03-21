import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

function validateIsbn(isbn: unknown): string | null {
  if (typeof isbn !== 'string') return null;
  if (!/^97[89]\d{10}$/.test(isbn)) return null;
  return isbn;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth || !supabaseAdmin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const body = await request.json().catch(() => ({}));
    const bookIsbn = validateIsbn(body.bookIsbn);
    const rating = typeof body.rating === 'number' ? body.rating : 0;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!bookIsbn || rating < 1 || rating > 5 || content.length < 10 || content.length > 1000) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const uid = decoded.uid;
    const { data: orders, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('items')
      .eq('user_id', uid)
      .eq('status', 'paid');

    if (orderError) {
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }

    const hasPurchased = (orders ?? []).some((order) =>
      Array.isArray(order.items) && order.items.some((item) => {
        if (!item || typeof item !== 'object') return false;
        return (item as { isbn?: string }).isbn === bookIsbn;
      })
    );

    if (!hasPurchased) {
      return NextResponse.json({ error: 'PURCHASE_REQUIRED' }, { status: 403 });
    }

    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('review_id')
      .eq('user_id', uid)
      .eq('book_isbn', bookIsbn)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json({ error: 'ALREADY_REVIEWED' }, { status: 409 });
    }

    const { data: book, error: bookError } = await supabaseAdmin
      .from('books')
      .select('isbn, rating_total, review_count')
      .eq('isbn', bookIsbn)
      .maybeSingle();

    if (bookError || !book) {
      return NextResponse.json({ error: 'BOOK_NOT_FOUND' }, { status: 404 });
    }

    const userName = decoded.name ?? decoded.email ?? '회원';
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        book_isbn: bookIsbn,
        user_id: uid,
        user_name: userName,
        rating,
        content,
      })
      .select('review_id')
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'CREATE_REVIEW_FAILED' }, { status: 500 });
    }

    const nextRatingTotal = Number(book.rating_total ?? 0) + rating;
    const nextReviewCount = Number(book.review_count ?? 0) + 1;
    const nextRating = Math.round((nextRatingTotal / nextReviewCount) * 100) / 100;

    const { error: updateError } = await supabaseAdmin
      .from('books')
      .update({
        rating_total: nextRatingTotal,
        review_count: nextReviewCount,
        rating: nextRating,
        updated_at: new Date().toISOString(),
      })
      .eq('isbn', bookIsbn);

    if (updateError) {
      return NextResponse.json({ error: 'CREATE_REVIEW_FAILED' }, { status: 500 });
    }

    return NextResponse.json({ success: true, reviewId: review.review_id });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

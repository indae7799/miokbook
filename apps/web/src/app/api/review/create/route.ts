import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

function getCallableUrl(name: string): string | null {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = process.env.FIREBASE_FUNCTIONS_REGION ?? 'us-central1';
  if (!projectId) return null;
  return `https://${region}-${projectId}.cloudfunctions.net/${name}`;
}

/** POST /api/review/create — 리뷰 작성 (PRD Section 15) */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    await adminAuth.verifyIdToken(idToken);

    const body = await request.json().catch(() => ({}));
    const bookIsbn = body.bookIsbn as string | undefined;
    const rating = body.rating as number | undefined;
    const content = typeof body.content === 'string' ? body.content.trim() : '';

    if (!bookIsbn || typeof rating !== 'number' || rating < 1 || rating > 5 || content.length < 10 || content.length > 1000) {
      return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const url = getCallableUrl('createReview');
    if (!url) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify({
        data: { bookIsbn, rating, content },
      }),
    });

    const json = await res.json().catch(() => ({}));
    const result = json?.result ?? json?.result?.data ?? json?.data ?? json;

    if (result?.success) {
      return NextResponse.json({ success: true, reviewId: result.reviewId });
    }

    const errMsg = json?.error?.message ?? json?.message ?? 'CREATE_REVIEW_FAILED';
    if (String(errMsg).includes('PURCHASE_REQUIRED')) {
      return NextResponse.json({ error: 'PURCHASE_REQUIRED' }, { status: 403 });
    }
    if (String(errMsg).includes('ALREADY_REVIEWED')) {
      return NextResponse.json({ error: 'ALREADY_REVIEWED' }, { status: 409 });
    }
    const status = res.ok ? 400 : res.status;
    return NextResponse.json({ error: errMsg }, { status });
  } catch {
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

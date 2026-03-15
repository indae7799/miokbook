import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken || !adminAuth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const decoded = await adminAuth.verifyIdToken(idToken);
    if ((decoded as { role?: string }).role !== 'admin') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    const [booksSnap, inventorySnap] = await Promise.all([
      adminDb.collection('books').orderBy('createdAt', 'desc').get(),
      adminDb.collection('inventory').get(),
    ]);
    const stockByIsbn: Record<string, number> = {};
    inventorySnap.docs.forEach((doc) => {
      stockByIsbn[doc.id] = Number(doc.data().stock ?? 0);
    });
    const books = booksSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        isbn: doc.id,
        slug: d.slug,
        title: d.title,
        author: d.author,
        publisher: d.publisher,
        coverImage: d.coverImage,
        listPrice: d.listPrice,
        salePrice: d.salePrice,
        category: d.category,
        status: d.status,
        isActive: d.isActive,
        stock: stockByIsbn[doc.id] ?? 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
        updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() ?? null,
      };
    });
    return NextResponse.json(books);
  } catch (e) {
    console.error('[admin/books GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

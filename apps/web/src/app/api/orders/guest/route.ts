import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

/** 비회원 주문 조회 (주문번호 + 주문자명 대조) */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const orderName = searchParams.get('orderName');

    if (!orderId || !orderName) {
      return NextResponse.json({ error: 'MISSING_PARAMS' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
    }

    // 1. 주문번호로 검색
    const snapshot = await adminDb
      .collection('orders')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const doc = snapshot.docs[0];
    const d = doc.data();

    // 2. 주문자명 대조 (보안)
    // shippingAddress.name 필드가 주문 시 입력한 주문자 이름이라고 가정
    const savedName = d.shippingAddress?.name;
    if (savedName !== orderName) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    // 3. 민감 정보 제외하고 반환
    const orderData = {
      orderId: d.orderId,
      status: d.status,
      shippingStatus: d.shippingStatus,
      items: d.items ?? [],
      totalPrice: d.totalPrice,
      shippingFee: d.shippingFee,
      shippingAddress: {
        name: d.shippingAddress?.name,
        // 주소 전체를 보여줄지 여부는 정책에 따라 (여기선 비회원이니 본인확인용으로 일부만 노출 가능하지만 편의상 제공)
        address: d.shippingAddress?.address, 
      },
      createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? null,
      deliveredAt: d.deliveredAt?.toDate?.()?.toISOString?.() ?? null,
    };

    return NextResponse.json(orderData);
  } catch (e) {
    console.error('[api/orders/guest GET]', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

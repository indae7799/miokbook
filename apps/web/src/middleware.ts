import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getProductionCanonicalHost } from '@/lib/site-origin';

/**
 * Vercel 프로덕션에서 `miokbook-해시-팀.vercel.app` 등으로 들어오면
 * 주소창·공유가 그 URL로 고정되므로, 정식 호스트로 308 리다이렉트한다.
 * 프리뷰 배포는 건드리지 않는다.
 */
export function middleware(request: NextRequest) {
  if (process.env.VERCEL_ENV !== 'production') {
    return NextResponse.next();
  }

  const canonical = getProductionCanonicalHost();
  if (!canonical) {
    return NextResponse.next();
  }

  const rawHost = request.headers.get('host')?.split(':')[0]?.toLowerCase();
  if (!rawHost || rawHost === canonical) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.hostname = canonical;
  url.protocol = 'https:';
  url.port = '';
  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// 네이버 지도 장소 ID 추출 패턴
// 예) https://map.naver.com/p/entry/place/12345678
//     https://map.naver.com/p/search/미옥서원/place/12345678
const NAVER_PLACE_PATTERN = /\/place\/(\d+)/;

// 단축 URL 여부
function isShortUrl(url: string): boolean {
  return url.includes('naver.me') || url.includes('me.naver.com');
}

function isNaverMapUrl(url: string): boolean {
  return url.includes('map.naver.com') || url.includes('naver.me');
}

async function resolveRedirect(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    return res.url || url;
  } catch {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    return res.url || url;
  }
}

export async function POST(request: Request) {
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

    const body = await request.json() as { url?: string };
    const rawUrl = body.url?.trim() ?? '';
    if (!rawUrl) {
      return NextResponse.json({ error: '주소를 입력해 주세요.' }, { status: 400 });
    }

    if (!isNaverMapUrl(rawUrl)) {
      return NextResponse.json(
        { error: '네이버 지도 공유 링크를 붙여넣어 주세요. (map.naver.com 또는 naver.me)' },
        { status: 400 },
      );
    }

    let resolvedUrl = rawUrl;

    // 단축 URL → 리다이렉트 따라가서 실제 URL 획득
    if (isShortUrl(rawUrl)) {
      try {
        resolvedUrl = await resolveRedirect(rawUrl);
      } catch {
        return NextResponse.json(
          { error: '네이버 지도 주소를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.' },
          { status: 502 },
        );
      }
    }

    // 장소 ID 추출 → /place/12345 형태
    const placeMatch = NAVER_PLACE_PATTERN.exec(resolvedUrl);
    if (placeMatch) {
      const placeId = placeMatch[1];
      const embedUrl = `https://map.naver.com/p/entry/place/${placeId}`;
      return NextResponse.json({ embedUrl });
    }

    // 장소 ID 없이 map.naver.com URL이면 그대로 사용
    if (resolvedUrl.includes('map.naver.com')) {
      // 불필요한 쿼리 파라미터 정리
      try {
        const parsed = new URL(resolvedUrl);
        // 기본 경로만 사용 (파라미터 제거로 깔끔하게)
        const cleanUrl = `${parsed.origin}${parsed.pathname}`;
        return NextResponse.json({ embedUrl: cleanUrl });
      } catch {
        return NextResponse.json({ embedUrl: resolvedUrl });
      }
    }

    return NextResponse.json(
      { error: '장소 정보를 찾을 수 없습니다. 네이버 지도에서 장소를 검색한 후 공유 링크를 복사해 주세요.' },
      { status: 422 },
    );
  } catch (e) {
    console.error('[resolve-maps]', e);
    return NextResponse.json({ error: '변환 실패' }, { status: 500 });
  }
}

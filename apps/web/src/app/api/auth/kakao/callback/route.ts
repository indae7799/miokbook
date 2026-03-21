import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY!;
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/login?error=kakao_cancelled', request.url));
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KAKAO_REST_API_KEY,
      redirect_uri: `${new URL(request.url).origin}/api/auth/kakao/callback`,
      code,
    });
    if (KAKAO_CLIENT_SECRET?.trim()) {
      tokenBody.set('client_secret', KAKAO_CLIENT_SECRET.trim());
    }

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: tokenBody,
    });

    if (!tokenRes.ok) {
      console.error('[kakao/callback] token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(new URL('/login?error=kakao_token_failed', request.url));
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      console.error('[kakao/callback] user fetch failed:', await userRes.text());
      return NextResponse.redirect(new URL('/login?error=kakao_user_failed', request.url));
    }

    const userData = await userRes.json() as {
      id: number;
      kakao_account?: {
        email?: string;
        profile?: { nickname?: string; profile_image_url?: string };
      };
      properties?: { nickname?: string; profile_image?: string };
    };

    const kakaoId = String(userData.id);
    const uid = `kakao:${kakaoId}`;
    const email = userData.kakao_account?.email ?? null;
    const nickname =
      userData.kakao_account?.profile?.nickname ??
      userData.properties?.nickname ??
      '카카오 사용자';
    const photoURL =
      userData.kakao_account?.profile?.profile_image_url ??
      userData.properties?.profile_image ??
      null;

    if (!adminAuth || !supabaseAdmin) {
      return NextResponse.redirect(new URL('/login?error=server_error', request.url));
    }

    try {
      await adminAuth.updateUser(uid, {
        displayName: nickname,
        ...(email ? { email } : {}),
        ...(photoURL ? { photoURL } : {}),
      });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === 'auth/user-not-found') {
        await adminAuth.createUser({
          uid,
          displayName: nickname,
          ...(email ? { email } : {}),
          ...(photoURL ? { photoURL } : {}),
        });
      } else {
        throw e;
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          uid,
          display_name: nickname,
          email,
          role: 'user',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'uid' }
      );

    if (profileError) {
      console.error('[kakao/callback] user_profiles upsert failed:', profileError);
    }

    const customToken = await adminAuth.createCustomToken(uid, { provider: 'kakao' });
    const callbackUrl = new URL('/auth/kakao-complete', request.url);
    callbackUrl.searchParams.set('token', customToken);
    return NextResponse.redirect(callbackUrl);
  } catch (e) {
    console.error('[kakao/callback] error:', e);
    return NextResponse.redirect(new URL('/login?error=kakao_failed', request.url));
  }
}

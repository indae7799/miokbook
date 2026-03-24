import type { User as FirebaseUser } from 'firebase/auth';

const TOKEN_TIMEOUT_MS = 12_000;

/**
 * Firebase `getIdToken()`에 타임아웃을 추가한 래퍼.
 * 토큰 갱신이 지연될 경우 무한 로딩을 방지합니다.
 */
export async function getAdminToken(user: FirebaseUser): Promise<string> {
  return Promise.race([
    user.getIdToken(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              '인증 토큰 갱신이 지연되고 있습니다. 페이지를 새로고침하거나 다시 로그인해 주세요.',
            ),
          ),
        TOKEN_TIMEOUT_MS,
      ),
    ),
  ]);
}

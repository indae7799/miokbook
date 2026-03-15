'use client';

/**
 * 루트 레이아웃/페이지에서 발생한 오류 시 표시.
 * 이 파일이 있으면 500 대신 이 UI가 렌더되도록 시도합니다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '480px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>일시적인 오류</h1>
        <p style={{ color: '#666', fontSize: '0.875rem', marginBottom: '1rem' }}>
          페이지를 불러오는 중 문제가 생겼습니다. Firebase·환경 변수(.env.local)를 확인하거나, .next 폴더를 삭제한 뒤 개발 서버를 다시 실행해 보세요.
          {error?.message && (
            <span style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem' }}>{error.message}</span>
          )}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '0.5rem 1rem',
            background: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}

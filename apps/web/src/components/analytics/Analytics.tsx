import Script from 'next/script';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';

const GA_ID = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').trim();
const USE_VERCEL_ANALYTICS = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS !== 'false';
/** GA ID 형식 검증 (G-XXXXXXXXXX 또는 UA-XXXXXXXXX-X) — 잘못된 값이면 400 방지 */
const isValidGaId = /^(G-[A-Z0-9]+|UA-\d+-\d+)$/.test(GA_ID);

/**
 * GA4 + (선택) Vercel Analytics.
 * - GA4: NEXT_PUBLIC_GA_MEASUREMENT_ID 설정 시 gtag 로드·page_view·검색/장바구니/결제 이벤트.
 *   호스팅 무관(Vercel / AWS / Cloudflare 등) 동작.
 * - Vercel Analytics: Vercel 배포 시에만 의미 있음. AWS·Cloudflare 이전 시
 *   NEXT_PUBLIC_VERCEL_ANALYTICS=false 로 끄거나 패키지 제거 가능.
 */
export default function Analytics() {
  return (
    <>
      {isValidGaId && GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { page_path: window.location.pathname });
            `}
          </Script>
        </>
      )}
      {USE_VERCEL_ANALYTICS && <VercelAnalytics />}
    </>
  );
}

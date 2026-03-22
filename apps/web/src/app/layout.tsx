import type { Metadata } from 'next';
import '@/app/globals.css';
import 'swiper/css';
import 'swiper/css/pagination';
import { AuthProvider } from '@/components/providers/AuthProvider';
import ScrollTopOnReload from '@/components/providers/ScrollTopOnReload';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import Analytics from '@/components/analytics/Analytics';
import ScrollToTopFab from '@/components/common/ScrollToTopFab';

const siteName = '미옥서원';
const defaultDescription = '책을 발견하는 공간. 독립서점의 경험을 온라인으로.';

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: { default: siteName, template: `%s | ${siteName}` },
  description: defaultDescription,
  openGraph: {
    title: siteName,
    description: defaultDescription,
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteName,
    description: defaultDescription,
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="font-sans" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap"
        />
        {/* Swiper CSS is required for correct layout (especially multi-slide carousels).
            Keep a CDN fallback to avoid bundling issues in dev. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"
        />
      </head>
      <body className="overflow-x-hidden">
        <ScrollTopOnReload />
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <ScrollToTopFab />
        <Analytics />
      </body>
    </html>
  );
}

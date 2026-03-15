/**
 * Sentry client-side (browser) SDK.
 * DSN이 없으면 초기화하지 않음 → 로컬(localhost)에서 그대로 동작.
 * 결제키/비밀번호/Firebase 키 등은 beforeSend에서 제외.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      // 결제키/비밀번호/Firebase admin 키 등 로그에 포함 금지 (PRD)
      if (event.message) {
        let msg = event.message;
        msg = msg.replace(/sk_live_[a-zA-Z0-9]+/g, '[REDACTED]');
        msg = msg.replace(/sk_test_[a-zA-Z0-9]+/g, '[REDACTED]');
        msg = msg.replace(/AIza[a-zA-Z0-9_-]+/g, '[REDACTED]');
        event.message = msg;
      }
      return event;
    },
  });
}

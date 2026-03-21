import { redirect } from 'next/navigation';

/** 이달의 책 기능 제거 — 기존 링크는 큐레이션 목록으로 연결 */
export default function CurationMonthlyRedirectPage() {
  redirect('/curation');
}

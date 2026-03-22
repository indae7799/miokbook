"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerStoreRevalidate = triggerStoreRevalidate;
/**
 * Next.js 스토어의 베스트셀러·신간·홈 ISR(unstable_cache) 무효화.
 * STORE_FRONTEND_URL + INTERNAL_REVALIDATE_SECRET 이 둘 다 있을 때만 요청합니다.
 */
async function triggerStoreRevalidate() {
    const base = process.env.STORE_FRONTEND_URL?.replace(/\/$/, '');
    const secret = process.env.INTERNAL_REVALIDATE_SECRET;
    if (!base || !secret)
        return;
    const url = `${base}/api/internal/revalidate-store-lists`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
        console.warn('[triggerStoreRevalidate]', res.status, await res.text().catch(() => ''));
    }
}

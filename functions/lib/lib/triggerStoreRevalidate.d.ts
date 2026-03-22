/**
 * Next.js 스토어의 베스트셀러·신간·홈 ISR(unstable_cache) 무효화.
 * STORE_FRONTEND_URL + INTERNAL_REVALIDATE_SECRET 이 둘 다 있을 때만 요청합니다.
 */
export declare function triggerStoreRevalidate(): Promise<void>;

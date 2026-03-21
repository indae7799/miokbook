/** 스토어 세그먼트 전환 시 즉시 피드백(도서 외 /cart, /mypage 등) */
export default function StoreLoading() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-[2px] overflow-hidden bg-border/60"
      aria-hidden
    >
      <div className="store-nav-progress-inner h-full bg-primary/90" />
    </div>
  );
}

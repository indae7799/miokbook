/** 어드민 하위 페이지 로딩 중 — 레이아웃(사이드바)은 유지되고 본문만 이 UI로 대체됩니다. */
export default function AdminSegmentLoading() {
  return (
    <div className="animate-pulse space-y-6 max-w-6xl">
      <div className="h-8 w-44 rounded-lg bg-gray-200/90" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-xl bg-gray-100" />
        <div className="h-28 rounded-xl bg-gray-100" />
        <div className="h-28 rounded-xl bg-gray-100 hidden lg:block" />
      </div>
      <div className="h-52 rounded-xl bg-gray-50 border border-gray-100" />
      <div className="space-y-2">
        <div className="h-4 w-full max-w-xl rounded bg-gray-100" />
        <div className="h-4 w-full max-w-lg rounded bg-gray-100" />
        <div className="h-4 w-full max-w-md rounded bg-gray-100" />
      </div>
    </div>
  );
}

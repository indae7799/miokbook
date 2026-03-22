/**
 * 유튜브 iframe embed URL 생성.
 * 브라우저 정책상 음성 있는 자동재생은 대부분 차단되므로, 클릭 직후 즉시 재생이 필요하면
 * `autoplay: true`와 함께 `mute: true`(기본)를 사용합니다. 사용자가 플레이어에서 음소거 해제 가능.
 */
export function youtubeEmbedUrl(
  videoId: string,
  options: {
    autoplay?: boolean;
    /** autoplay 시 기본 true — 무음이면 즉시 재생 허용률이 높음 */
    mute?: boolean;
    enableJsApi?: boolean;
  } = {},
): string {
  const { autoplay = false, mute = true, enableJsApi = false } = options;
  const id = videoId.trim();
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  if (enableJsApi) params.set('enablejsapi', '1');
  if (autoplay) {
    params.set('autoplay', '1');
    if (mute) params.set('mute', '1');
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params}`;
}

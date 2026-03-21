/**
 * [slug] 라우트 파라미터와 Firestore에 저장된 slug가
 * (퍼센트 인코딩·NFC/NFD 등으로) 달라져 조회가 실패하는 경우를 줄입니다.
 */
export function youtubeContentSlugSearchVariants(param: string): string[] {
  const seen = new Set<string>();
  const add = (s: string) => {
    const t = s.trim();
    if (t) seen.add(t);
  };

  add(param);

  if (param.includes('%')) {
    try {
      add(decodeURIComponent(param.replace(/\+/g, ' ')));
    } catch {
      /* ignore */
    }
  }

  const snapshot = [...seen];
  for (const s of snapshot) {
    add(s.normalize('NFC'));
    add(s.normalize('NFD'));
    add(s.normalize('NFKC'));
  }

  return [...seen];
}

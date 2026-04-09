export function collapseHyphens(value: string): string {
  return value.replace(/-+/g, '-');
}

export function normalizeUrlSlug(raw: string): string {
  return collapseHyphens(raw.trim())
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '');
}

export function slugifyForStore(value: string): string {
  return normalizeUrlSlug(
    value
      .normalize('NFC')
      .toLowerCase()
      .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ-]/g, ''),
  ).slice(0, 80);
}

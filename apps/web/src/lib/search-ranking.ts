function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

function getTitlePriority(title: string, keyword: string): number {
  const normalizedTitle = normalizeForSearch(title);
  if (!keyword) return 3;
  if (normalizedTitle === keyword) return 0;
  if (normalizedTitle.startsWith(keyword)) return 1;
  if (normalizedTitle.includes(keyword)) return 2;
  return 3;
}

export function compareTitlesNaturally(a: string, b: string): number {
  return a.localeCompare(b, 'ko-KR', { numeric: true, sensitivity: 'base' });
}

export function sortByKeywordAndTitle<T extends { title: string; author?: string; isbn?: string }>(
  items: T[],
  rawKeyword: string,
): T[] {
  const keyword = normalizeForSearch(rawKeyword.trim());
  return [...items].sort((a, b) => {
    const priorityDiff = getTitlePriority(a.title, keyword) - getTitlePriority(b.title, keyword);
    if (priorityDiff !== 0) return priorityDiff;

    const titleDiff = compareTitlesNaturally(a.title, b.title);
    if (titleDiff !== 0) return titleDiff;

    const authorDiff = compareTitlesNaturally(a.author ?? '', b.author ?? '');
    if (authorDiff !== 0) return authorDiff;

    return compareTitlesNaturally(a.isbn ?? '', b.isbn ?? '');
  });
}

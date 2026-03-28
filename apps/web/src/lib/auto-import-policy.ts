const BLOCKED_CATEGORY_KEYWORDS = [
  '만화',
  '라이트노벨',
  '중고전집',
  '종교',
] as const;

const BLOCKED_STATUS_KEYWORDS = ['중고', '품절', '절판', '구판'] as const;

function normalizeText(value: string | undefined | null): string {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

export function isBlockedAutoImportTarget(params: {
  categoryName?: string | null;
  stockStatus?: string | null;
  itemStatus?: string | null;
}): boolean {
  const category = normalizeText(params.categoryName);
  const stockStatus = normalizeText(params.stockStatus);
  const itemStatus = normalizeText(params.itemStatus);

  if (
    BLOCKED_CATEGORY_KEYWORDS.some((keyword) => category.includes(keyword))
  ) {
    return true;
  }

  if (
    BLOCKED_STATUS_KEYWORDS.some(
      (keyword) => stockStatus.includes(keyword) || itemStatus.includes(keyword),
    )
  ) {
    return true;
  }

  return false;
}

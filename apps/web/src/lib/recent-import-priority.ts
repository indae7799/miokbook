const RECENT_IMPORT_TTL_MS = 30 * 60_000;
const recentImportedAt = new Map<string, number>();

function pruneRecentImports(now = Date.now()): void {
  for (const [isbn, importedAt] of recentImportedAt) {
    if (now - importedAt > RECENT_IMPORT_TTL_MS) {
      recentImportedAt.delete(isbn);
    }
  }
}

export function markBookAsRecentlyImported(isbn: string, importedAt = Date.now()): void {
  if (!isbn) return;
  recentImportedAt.set(isbn, importedAt);
  pruneRecentImports(importedAt);
}

export function getRecentImportedAt(isbn: string): number | null {
  pruneRecentImports();
  return recentImportedAt.get(isbn) ?? null;
}

export function prioritizeRecentlyImportedRows<T extends { isbn: string; created_at?: string | null }>(rows: T[]): T[] {
  pruneRecentImports();
  return [...rows].sort((a, b) => {
    const recentA = recentImportedAt.get(a.isbn) ?? 0;
    const recentB = recentImportedAt.get(b.isbn) ?? 0;
    if (recentA !== recentB) return recentB - recentA;

    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createdB - createdA;
  });
}

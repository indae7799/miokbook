import { describe, expect, it } from 'vitest';
import { isBlockedAutoImportTarget } from '../../apps/web/src/lib/auto-import-policy';

describe('isBlockedAutoImportTarget', () => {
  it('blocks old edition books', () => {
    expect(
      isBlockedAutoImportTarget({
        categoryName: '국내도서>소설',
        itemStatus: '구판',
      }),
    ).toBe(true);
  });
});

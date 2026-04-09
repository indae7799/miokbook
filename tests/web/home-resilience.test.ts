import { describe, expect, it, vi } from 'vitest';
import { readWithRetryAndStale } from '../../apps/web/src/lib/store/home-resilience';

describe('readWithRetryAndStale', () => {
  it('retries and returns a later successful value', async () => {
    const read = vi
      .fn<(attempt: number) => Promise<{ value: string } | null>>()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ value: 'fresh' });

    const onError = vi.fn();
    const result = await readWithRetryAndStale({
      attempts: 2,
      read,
      isValid: (value) => Boolean(value),
      onError,
    });

    expect(result).toEqual({ value: 'fresh' });
    expect(read).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('returns stale data when every retry fails', async () => {
    const read = vi.fn<(attempt: number) => Promise<{ value: string } | null>>().mockRejectedValue(new Error('down'));
    const onStaleReturn = vi.fn();

    const result = await readWithRetryAndStale({
      attempts: 2,
      read,
      staleValue: { value: 'stale' },
      isValid: (value) => Boolean(value),
      onStaleReturn,
    });

    expect(result).toEqual({ value: 'stale' });
    expect(read).toHaveBeenCalledTimes(2);
    expect(onStaleReturn).toHaveBeenCalledTimes(1);
  });

  it('treats invalid values as retryable and falls back to stale data', async () => {
    const read = vi
      .fn<(attempt: number) => Promise<{ value: string } | null>>()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const onError = vi.fn();
    const result = await readWithRetryAndStale({
      attempts: 2,
      read,
      staleValue: { value: 'last-good' },
      isValid: (value) => Boolean(value),
      onError,
    });

    expect(result).toEqual({ value: 'last-good' });
    expect(read).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledTimes(2);
  });
});

export interface RetryReadOptions<T> {
  attempts: number;
  read: (attempt: number) => Promise<T>;
  isValid?: (value: T) => boolean;
  staleValue?: T | null;
  onError?: (error: unknown, attempt: number) => void;
  onStaleReturn?: () => void;
}

export async function readWithRetryAndStale<T>({
  attempts,
  read,
  isValid = (value) => value !== null && value !== undefined,
  staleValue = null,
  onError,
  onStaleReturn,
}: RetryReadOptions<T>): Promise<T | null> {
  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
    try {
      const value = await read(attempt);
      if (isValid(value)) {
        return value;
      }
      onError?.(new Error('invalid read result'), attempt);
    } catch (error) {
      onError?.(error, attempt);
    }
  }

  if (staleValue !== null && staleValue !== undefined) {
    onStaleReturn?.();
  }
  return staleValue;
}

import { createHash } from 'crypto';
import type { BulkContractSnapshot } from '@/lib/bulk-contract';

export function hashBulkContractSnapshot(snapshot: BulkContractSnapshot): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

export function getRequestIp(request: Request): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || null;
}

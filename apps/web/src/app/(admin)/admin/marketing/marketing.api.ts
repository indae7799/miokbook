import type { CmsHome, CmsPatchPayload } from './marketing.types';

type ApiErrorPayload = { error?: string };

async function parseApiError(response: Response): Promise<string> {
  const fallback = response.statusText || '요청 처리 중 오류가 발생했습니다.';
  const parsed = await response.json().catch(() => ({} as ApiErrorPayload));
  return parsed.error || fallback;
}

export async function fetchCms(token: string): Promise<CmsHome> {
  const response = await fetch('/api/admin/cms', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
  return response.json();
}

export async function patchCms(token: string, payload: CmsPatchPayload): Promise<void> {
  const response = await fetch('/api/admin/cms', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}

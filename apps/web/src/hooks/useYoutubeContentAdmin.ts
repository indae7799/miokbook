import { useState } from 'react';
import { auth } from '@/lib/firebase/client';
import type { BookMeta, YoutubeContent } from '@/types/youtube-content';

async function getAuthHeader(): Promise<HeadersInit> {
  const token = await auth?.currentUser?.getIdToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const BASE = '/api/admin/youtube-content';

export function useYoutubeContentAdmin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    setIsLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '오류가 발생했습니다.';
      setError(msg);
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }

  async function getAll(): Promise<YoutubeContent[]> {
    return run(async () => {
      const res = await fetch(BASE, { headers: await getAuthHeader() });
      if (!res.ok) throw new Error('목록을 불러오지 못했습니다.');
      return res.json() as Promise<YoutubeContent[]>;
    }, []);
  }

  async function create(data: Omit<YoutubeContent, 'id'>): Promise<string | null> {
    return run(async () => {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: await getAuthHeader(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('등록에 실패했습니다.');
      const { id } = (await res.json()) as { id: string };
      return id;
    }, null);
  }

  async function update(id: string, data: Partial<Omit<YoutubeContent, 'id'>>): Promise<boolean> {
    return run(async () => {
      const res = await fetch(BASE, {
        method: 'PUT',
        headers: await getAuthHeader(),
        body: JSON.stringify({ id, ...data }),
      });
      if (!res.ok) throw new Error('수정에 실패했습니다.');
      return true;
    }, false);
  }

  async function remove(id: string): Promise<boolean> {
    return run(async () => {
      const res = await fetch(BASE, {
        method: 'DELETE',
        headers: await getAuthHeader(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('삭제에 실패했습니다.');
      return true;
    }, false);
  }

  async function searchBooks(query: string): Promise<BookMeta[]> {
    return run(async () => {
      const res = await fetch(`${BASE}/books?keyword=${encodeURIComponent(query)}`, {
        headers: await getAuthHeader(),
      });
      if (!res.ok) throw new Error('도서 검색에 실패했습니다.');
      return res.json() as Promise<BookMeta[]>;
    }, []);
  }

  return { getAll, create, update, remove, searchBooks, isLoading, error };
}

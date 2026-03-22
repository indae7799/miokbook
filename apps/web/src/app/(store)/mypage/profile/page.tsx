'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ProfileData {
  displayName: string;
  email: string;
  phone: string;
}

async function fetchProfile(token: string): Promise<ProfileData> {
  const res = await fetch('/api/auth/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export default function MypageProfilePage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileData>({ displayName: '', email: '', phone: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.detail('profile'),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchProfile(token);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  const updateField = (key: keyof ProfileData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'SAVE_FAILED');
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail('profile') });
      setMessage('회원정보를 저장했습니다.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">회원정보 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">기본 연락처를 관리합니다.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/mypage">마이페이지로 돌아가기</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">불러오는 중...</div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {error instanceof Error ? error.message : '회원정보를 불러오지 못했습니다.'}
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5 rounded-lg border border-border bg-card p-6">
            <div>
              <label className="mb-2 block text-sm font-medium">이름</label>
              <Input value={form.displayName} onChange={(e) => updateField('displayName', e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">이메일</label>
              <Input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">휴대폰 번호</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="01012345678"
              />
            </div>
            {message && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
                {message}
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

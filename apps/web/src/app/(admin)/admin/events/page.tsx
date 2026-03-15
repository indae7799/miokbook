'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { useState } from 'react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getEventTypeLabel } from '@/lib/eventLabels';

const EVENT_TYPES = [
  { value: 'book_concert', label: '북콘서트' },
  { value: 'author_talk', label: '저자강연' },
  { value: 'book_club', label: '독서모임' },
] as const;

interface EventRow {
  eventId: string;
  title: string;
  type: string;
  description: string;
  imageUrl: string;
  date: string | null;
  location: string;
  capacity: number;
  registeredCount: number;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface RegistrationRow {
  registrationId: string;
  eventId: string;
  userId: string;
  userName: string;
  createdAt: string | null;
}

async function fetchEvents(token: string): Promise<EventRow[]> {
  const res = await fetch('/api/admin/events', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function fetchRegistrations(token: string, eventId: string): Promise<RegistrationRow[]> {
  const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}/registrations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('ko-KR');
}

export default function AdminEventsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [registrationsEventId, setRegistrationsEventId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<EventRow>>({
    title: '',
    type: 'book_concert',
    description: '',
    imageUrl: '',
    date: new Date().toISOString().slice(0, 16),
    location: '',
    capacity: 30,
    isActive: true,
  });

  const { data: events = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.events(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchEvents(token);
    },
    enabled: !!user,
  });

  const { data: registrations = [], isLoading: loadingReg } = useQuery({
    queryKey: queryKeys.admin.eventRegistrations(registrationsEventId ?? ''),
    queryFn: async () => {
      if (!user || !registrationsEventId) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchRegistrations(token, registrationsEventId);
    },
    enabled: !!user && !!registrationsEventId,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.events() });
      toast.success('이벤트가 등록되었습니다.');
      setAdding(false);
      resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '등록 실패'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ eventId, payload }: { eventId: string; payload: Record<string, unknown> }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.events() });
      toast.success('수정되었습니다.');
      setEditingEvent(null);
      resetForm();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '수정 실패'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/events/${encodeURIComponent(eventId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.events() });
      toast.success('삭제되었습니다.');
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '삭제 실패'),
  });

  function resetForm() {
    setForm({
      title: '',
      type: 'book_concert',
      description: '',
      imageUrl: '',
      date: new Date().toISOString().slice(0, 16),
      location: '',
      capacity: 30,
      isActive: true,
    });
  }

  function openEdit(e: EventRow) {
    setEditingEvent(e);
    setForm({
      title: e.title,
      type: e.type,
      description: e.description,
      imageUrl: e.imageUrl,
      date: e.date ? e.date.slice(0, 16) : new Date().toISOString().slice(0, 16),
      location: e.location,
      capacity: e.capacity,
      isActive: e.isActive,
    });
  }

  function handleSubmitAdd() {
    if (!form.title?.trim() || !form.imageUrl?.trim()) {
      toast.error('제목과 이미지 URL을 입력해 주세요.');
      return;
    }
    createMutation.mutate({
      title: form.title.trim(),
      type: form.type ?? 'book_concert',
      description: form.description ?? '',
      imageUrl: form.imageUrl.trim(),
      date: form.date ?? new Date().toISOString(),
      location: form.location ?? '',
      capacity: form.capacity ?? 30,
      isActive: form.isActive !== false,
    });
  }

  function handleSubmitEdit() {
    if (!editingEvent || !form.title?.trim() || !form.imageUrl?.trim()) return;
    updateMutation.mutate({
      eventId: editingEvent.eventId,
      payload: {
        title: form.title.trim(),
        type: form.type ?? 'book_concert',
        description: form.description ?? '',
        imageUrl: form.imageUrl.trim(),
        date: form.date ?? new Date().toISOString(),
        location: form.location ?? '',
        capacity: form.capacity ?? 30,
        isActive: form.isActive !== false,
      },
    });
  }

  if (error) {
    return (
      <main className="p-6">
        <EmptyState title="오류" message={error instanceof Error ? error.message : '이벤트 목록을 불러올 수 없습니다.'} />
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">이벤트 관리</h1>
        <Button onClick={() => { setAdding(true); resetForm(); }}>이벤트 등록</Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">로딩 중…</p>
      ) : events.length === 0 ? (
        <EmptyState title="등록된 이벤트 없음" message="이벤트를 등록해 주세요." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border p-2 text-left">제목</th>
                <th className="border border-border p-2 text-left">유형</th>
                <th className="border border-border p-2 text-left">일시</th>
                <th className="border border-border p-2 text-center">참가</th>
                <th className="border border-border p-2 text-center">상태</th>
                <th className="border border-border p-2 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.eventId} className="border-b border-border">
                  <td className="border border-border p-2 font-medium">{e.title}</td>
                  <td className="border border-border p-2">{getEventTypeLabel(e.type)}</td>
                  <td className="border border-border p-2 text-muted-foreground">{formatDate(e.date)}</td>
                  <td className="border border-border p-2 text-center">
                    {e.registeredCount} / {e.capacity}
                  </td>
                  <td className="border border-border p-2 text-center">
                    {e.isActive ? (
                      <span className="text-green-600">노출</span>
                    ) : (
                      <span className="text-muted-foreground">비노출</span>
                    )}
                  </td>
                  <td className="border border-border p-2 text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setRegistrationsEventId(e.eventId)}>
                      참가자
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(e)}>수정</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`"${e.title}" 이벤트를 삭제할까요?`)) {
                          deleteMutation.mutate(e.eventId);
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 등록 폼 */}
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>이벤트 등록</DialogTitle>
          </DialogHeader>
          <EventForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>취소</Button>
            <Button onClick={handleSubmitAdd} disabled={createMutation.isPending}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 폼 */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>이벤트 수정</DialogTitle>
          </DialogHeader>
          <EventForm form={form} setForm={setForm} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvent(null)}>취소</Button>
            <Button onClick={handleSubmitEdit} disabled={updateMutation.isPending}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 참가자 목록 */}
      <Dialog open={!!registrationsEventId} onOpenChange={(open) => !open && setRegistrationsEventId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>참가자 목록</DialogTitle>
          </DialogHeader>
          {loadingReg ? (
            <p className="text-sm text-muted-foreground">로딩 중…</p>
          ) : registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">참가자가 없습니다.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {registrations.map((r) => (
                <li key={r.registrationId} className="flex justify-between text-sm border-b border-border pb-2">
                  <span>{r.userName || r.userId}</span>
                  <span className="text-muted-foreground">{formatDate(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrationsEventId(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function EventForm({
  form,
  setForm,
}: {
  form: Partial<EventRow>;
  setForm: React.Dispatch<React.SetStateAction<Partial<EventRow>>>;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div>
        <Label>제목</Label>
        <Input
          value={form.title ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="이벤트 제목"
        />
      </div>
      <div>
        <Label>유형</Label>
        <select
          className="w-full border rounded-md px-3 py-2 bg-background"
          value={form.type ?? 'book_concert'}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <Label>이미지 URL</Label>
        <Input
          value={form.imageUrl ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label>일시</Label>
        <Input
          type="datetime-local"
          value={form.date ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
      </div>
      <div>
        <Label>장소</Label>
        <Input
          value={form.location ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          placeholder="장소"
        />
      </div>
      <div>
        <Label>정원</Label>
        <Input
          type="number"
          min={1}
          value={form.capacity ?? 30}
          onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 1 }))}
        />
      </div>
      <div>
        <Label>설명</Label>
        <textarea
          className="w-full border rounded-md px-3 py-2 bg-background min-h-[80px]"
          value={form.description ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="이벤트 설명"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={form.isActive !== false}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
        <Label htmlFor="isActive">노출 (활성)</Label>
      </div>
    </div>
  );
}

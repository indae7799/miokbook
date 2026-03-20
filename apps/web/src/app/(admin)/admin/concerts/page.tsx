'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { queryKeys } from '@/lib/queryKeys';
import { useState } from 'react';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
  eventTitle?: string;
  userId: string;
  userName: string;
  userEmail: string;
  phone: string;
  address: string;
  status: string;
  cancelReason: string;
  createdAt: string | null;
  cancelledAt: string | null;
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

export default function AdminConcertsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [registrationsEventId, setRegistrationsEventId] = useState<string | null>(null);
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeChecked, setPurgeChecked] = useState(false);

  const { data: allEvents = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.events(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchEvents(token);
    },
    enabled: !!user,
  });

  // Filter for Book Concerts only
  const events = allEvents.filter(e => e.type === 'book_concert');

  const { data: registrations = [], isLoading: loadingReg } = useQuery({
    queryKey: queryKeys.admin.eventRegistrations(registrationsEventId ?? ''),
    queryFn: async () => {
      if (!user || !registrationsEventId) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      return fetchRegistrations(token, registrationsEventId);
    },
    enabled: !!user && !!registrationsEventId,
  });

  const purgeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/concerts/purge-registrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : res.statusText);
      }
      return data as { deletedRegistrations: number; bookConcertEventCount: number };
    },
    onSuccess: (data) => {
      toast.success(
        `북콘서트 신청 ${data.deletedRegistrations}건을 삭제했습니다. (이벤트 ${data.bookConcertEventCount}개의 인원 수를 0으로 맞춤)`
      );
      setPurgeOpen(false);
      setPurgeChecked(false);
      setRegistrationsEventId(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.events() });
    },
    onError: (e: Error) => {
      toast.error(e.message || '삭제에 실패했습니다.');
    },
  });

  if (error) {
    return (
      <main className="p-6">
        <EmptyState title="오류" message={error instanceof Error ? error.message : '목록을 불러올 수 없습니다.'} />
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold">북콘서트 참가자 관리</h1>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="shrink-0"
          onClick={() => {
            setPurgeChecked(false);
            setPurgeOpen(true);
          }}
        >
          북콘서트 신청 DB 비우기
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">로딩 중…</p>
      ) : events.length === 0 ? (
        <EmptyState title="등록된 북콘서트 없음" message="이벤트 관리에서 '북콘서트' 유형의 이벤트를 먼저 등록해 주세요." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border p-3 text-left">콘서트 제목</th>
                <th className="border border-border p-3 text-left">일시</th>
                <th className="border border-border p-3 text-center">참가 현황</th>
                <th className="border border-border p-3 text-center">상태</th>
                <th className="border border-border p-3 text-right">참가자 명단</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.eventId} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="border border-border p-3 font-medium">{e.title}</td>
                  <td className="border border-border p-3 text-muted-foreground">{formatDate(e.date)}</td>
                  <td className="border border-border p-3 text-center">
                    <span className="font-semibold text-primary">{e.registeredCount}</span> / {e.capacity}
                  </td>
                  <td className="border border-border p-3 text-center text-xs">
                    {e.isActive ? (
                      <span className="px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">모집 중</span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-gray-50 text-gray-500 border border-gray-200">종료/비노출</span>
                    )}
                  </td>
                  <td className="border border-border p-3 text-right">
                    <Button variant="default" size="sm" onClick={() => setRegistrationsEventId(e.eventId)}>
                      참가자 관리
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={purgeOpen}
        onOpenChange={(open) => {
          setPurgeOpen(open);
          if (!open) setPurgeChecked(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>북콘서트 신청 데이터만 삭제</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">북콘서트</strong> 유형 이벤트에 대한{' '}
              <strong className="text-foreground">참가 신청 기록(eventRegistrations)</strong>만 삭제합니다.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>이벤트 글·썸네일 등 <strong className="text-foreground">파일·스토리지는 삭제하지 않습니다.</strong></li>
              <li>저자강연·독서모임 등 다른 유형 이벤트 신청은 <strong className="text-foreground">건드리지 않습니다.</strong></li>
              <li>삭제 후 각 북콘서트 이벤트의 <strong className="text-foreground">신청 인원 수는 0</strong>으로 맞춥니다.</li>
            </ul>
            <label className="flex items-start gap-2 cursor-pointer text-foreground">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-border"
                checked={purgeChecked}
                onChange={(e) => setPurgeChecked(e.target.checked)}
              />
              <span className="text-sm">위 내용을 이해했고, 북콘서트 신청 DB만 비웁니다.</span>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPurgeOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!purgeChecked || purgeMutation.isPending}
              onClick={() => purgeMutation.mutate()}
            >
              {purgeMutation.isPending ? '삭제 중…' : '신청 데이터 삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 참가자 목록 */}
      <Dialog open={!!registrationsEventId} onOpenChange={(open) => !open && setRegistrationsEventId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>북콘서트 참가자 현황</DialogTitle>
          </DialogHeader>
          {loadingReg ? (
            <div className="py-10 text-center">
              <div className="inline-block size-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm text-muted-foreground">명단을 불러오는 중입니다...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-border rounded-xl">
              <p className="text-sm text-muted-foreground">아직 신청자가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">전체 신청자: <span className="text-foreground font-bold">{registrations.length}</span>명</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const event = events.find(ev => ev.eventId === registrationsEventId);
                    const csvContent = "data:text/csv;charset=utf-8," 
                      + ["이름,연락처,이메일,주소,상태,신청일"].join(",") + "\n"
                      + registrations.map(r => [
                          r.userName,
                          r.phone,
                          r.userEmail,
                          `"${r.address.replace(/"/g, '""')}"`,
                          r.status,
                          r.createdAt
                        ].join(",")).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", `${event?.title || '북콘서트'}_참가자명단.csv`);
                    document.body.appendChild(link);
                    link.click();
                  }}
                >
                  명단 다운로드 (CSV)
                </Button>
              </div>
              <div className="h-[400px] overflow-y-auto border border-border rounded-lg">
                <ul className="divide-y divide-border">
                  {registrations.map((r) => (
                    <li key={r.registrationId} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-base">{r.userName || '이름 없음'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          r.status === 'cancelled' 
                            ? 'bg-red-50 text-red-600 border-red-200' 
                            : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                          {r.status === 'cancelled' ? '취소됨' : '신청완료'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground">
                        <div>
                          <p className="font-semibold text-[10px] uppercase tracking-wider mb-0.5">연락처</p>
                          <p className="text-foreground">{r.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[10px] uppercase tracking-wider mb-0.5">이메일</p>
                          <p className="text-foreground">{r.userEmail || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="font-semibold text-[10px] uppercase tracking-wider mb-0.5">주소</p>
                          <p className="text-foreground">{r.address || '-'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="font-semibold text-[10px] uppercase tracking-wider mb-0.5">신청일</p>
                          <p className="text-foreground">{formatDate(r.createdAt)}</p>
                        </div>
                      </div>
                      {r.cancelReason && (
                        <div className="mt-3 bg-red-50/50 p-2 rounded text-xs text-red-600 border border-red-100 italic">
                          취소 사유: {r.cancelReason}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setRegistrationsEventId(null)}>닫기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

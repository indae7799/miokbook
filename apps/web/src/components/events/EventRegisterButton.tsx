'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';

interface EventRegisterButtonProps {
  eventId: string;
  capacity: number;
  registeredCount: number;
}

export default function EventRegisterButton({ eventId, capacity, registeredCount }: EventRegisterButtonProps) {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const remaining = Math.max(0, capacity - registeredCount);
  const isFull = remaining <= 0;

  async function handleRegister() {
    if (!user) {
      setMessage('로그인 후 신청할 수 있습니다.');
      return;
    }
    if (isFull) {
      setMessage('정원이 마감되었습니다.');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage('신청이 완료되었습니다.');
        window.location.reload();
      } else if (res.status === 404 || res.status === 501) {
        setMessage('이벤트 신청 기능이 곧 열립니다.');
      } else if (data.error === 'EVENT_FULL') {
        setMessage('정원이 마감되었습니다.');
      } else if (data.error === 'ALREADY_REGISTERED') {
        setMessage('이미 신청하신 이벤트입니다.');
      } else {
        setMessage(data.message ?? data.error ?? '신청에 실패했습니다.');
      }
    } catch {
      setMessage('신청 요청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        잔여 인원: {remaining}명 {capacity > 0 && `(정원 ${capacity}명)`}
      </p>
      <Button
        onClick={handleRegister}
        disabled={loading || isFull}
        className="w-full sm:w-auto min-w-[120px]"
      >
        {loading ? '처리 중…' : isFull ? '정원 마감' : '이벤트 신청'}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

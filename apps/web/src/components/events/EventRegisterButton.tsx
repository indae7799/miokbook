'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import EventRegistrationForm from './EventRegistrationForm';

interface EventRegisterButtonProps {
  eventId: string;
  eventTitle: string;
  capacity: number;
  registeredCount: number;
}

export default function EventRegisterButton({
  eventId,
  eventTitle,
  capacity,
  registeredCount,
}: EventRegisterButtonProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const remaining = Math.max(0, capacity - registeredCount);
  const isFull = capacity > 0 && remaining <= 0;

  function handleOpenRegister() {
    if (!user) {
      toast.info('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.');
      const dest = `/events/${eventId}`;
      router.push(`/login?redirect=${encodeURIComponent(dest)}`);
      return;
    }
    if (isFull) {
      toast.error('정원이 마감되었습니다.');
      return;
    }
    setShowForm(true);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        잔여 인원: {remaining}명 {capacity > 0 && `(정원 ${capacity}명)`}
      </p>
      <Button
        onClick={handleOpenRegister}
        disabled={isFull}
        className="w-full sm:w-auto min-w-[120px]"
      >
        {isFull ? '정원 마감' : '이벤트 신청'}
      </Button>

      {showForm && (
        <EventRegistrationForm
          eventId={eventId}
          eventTitle={eventTitle}
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import EventRegistrationForm from './EventRegistrationForm';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
}

export interface EventCardEvent {
  eventId: string;
  title: string;
  type: string;
  description?: string;
  imageUrl: string;
  date: string;
  location?: string;
  capacity: number;
  registeredCount: number;
}

const TYPE_LABEL: Record<string, string> = {
  book_concert: '북콘서트',
  author_talk: '공연',
  book_club: '독서모임',
};

export interface EventCardProps {
  event: EventCardEvent;
  /** 홈 히어로 등 첫 화면 이미지 — LCP 경고 방지 */
  priority?: boolean;
  /** CMS에서 지정한 카드 배경 이미지 (설정 시 event.imageUrl 대신 사용) */
  imageUrlOverride?: string;
}

export default function EventCard({ event, priority, imageUrlOverride }: EventCardProps) {
  const router = useRouter();
  const [showRegForm, setShowRegForm] = useState(false);
  const user = useAuthStore((s) => s.user);

  const dateStr = formatEventDate(event.date);
  const typeLabel = TYPE_LABEL[event.type] ?? event.type;
  const imageUrl = (imageUrlOverride?.trim() || event.imageUrl?.trim());

  const handleRegisterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info('로그인이 필요한 서비스입니다. 로그인 페이지로 이동합니다.');
      const dest = `/events/${event.eventId}`;
      router.push(`/login?redirect=${encodeURIComponent(dest)}`);
      return;
    }
    setShowRegForm(true);
  };

  return (
    <>
      <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-md">
        <Link href={`/events/${event.eventId}`} className="block relative aspect-[4/5] w-full bg-muted overflow-hidden">
          {imageUrl ? (
            <Image 
              src={imageUrl} 
              alt={event.title} 
              fill 
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" 
              className="object-cover transition-transform duration-500 group-hover:scale-105" 
              {...(priority ? { priority: true } : {})}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground bg-[#f3f0eb]">
              No Image
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 rounded-md bg-white/90 backdrop-blur-sm text-[10px] font-bold text-primary border border-primary/20 shadow-sm">
              {typeLabel}
            </span>
          </div>
        </Link>
        <div className="flex flex-1 flex-col justify-between p-4 pb-[19px]">
          <div>
            <Link href={`/events/${event.eventId}`} className="line-clamp-2 font-bold text-base leading-snug transition-colors hover:text-primary">
              {event.title}
            </Link>
            {dateStr && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 font-medium">
                <span className="w-1 h-1 rounded-full bg-primary/40" />
                {dateStr}
              </p>
            )}
            {event.description ? (
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {event.description}
              </p>
            ) : null}
          </div>
          
          <div className="mt-6 flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1 rounded-lg h-10 text-xs">
              <Link href={`/events/${event.eventId}`}>상세보기</Link>
            </Button>
            <Button size="sm" className="flex-1 rounded-lg h-10 text-xs font-semibold" onClick={handleRegisterClick}>
              신청하기
            </Button>
          </div>
        </div>
      </article>

      {showRegForm && (
        <EventRegistrationForm
          eventId={event.eventId}
          eventTitle={event.title}
          isOpen={showRegForm}
          onClose={() => setShowRegForm(false)}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}

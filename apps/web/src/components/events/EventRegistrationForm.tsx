'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EventRegistrationFormProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EventRegistrationForm({
  eventId,
  eventTitle,
  isOpen,
  onClose,
  onSuccess,
}: EventRegistrationFormProps) {
  const user = useAuthStore((s) => s.user);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!isOpen || !user) return;
    setPrivacyAccepted(false);
    setDisplayName(user.displayName?.trim() ?? '');
    setEmail(user.email?.trim() ?? '');
    setPhone(user.phoneNumber?.replace(/\s/g, '') ?? '');
  }, [isOpen, user]);

  const handleRegister = async () => {
    if (!user) {
      toast.error('로그인이 필요한 서비스입니다.');
      return;
    }

    if (!privacyAccepted) {
      toast.error('개인정보 수집 및 이용에 동의해야 신청이 가능합니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          eventTitle,
          privacyAccepted: true,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = typeof data.error === 'string' ? data.error : '';
        if (code === 'ALREADY_REGISTERED') {
          toast.error('이미 신청하신 이벤트입니다.');
          return;
        }
        if (code === 'EVENT_FULL') {
          toast.error('정원이 모두 찼습니다.');
          return;
        }
        if (code === 'EVENT_CLOSED') {
          toast.error('종료된 이벤트입니다.');
          return;
        }
        if (code === 'PRIVACY_REQUIRED') {
          toast.error('개인정보 수집 및 이용에 동의해 주세요.');
          return;
        }
        throw new Error(code || '신청에 실패했습니다.');
      }

      toast.success('이벤트 신청이 완료되었습니다!');
      onSuccess?.();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '처리 중 오류가 발생했습니다.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>강연 신청</DialogTitle>
          <DialogDescription className="text-left space-y-2">
            <span className="block text-sm text-foreground font-medium leading-snug">{eventTitle}</span>
            <span className="block text-xs text-muted-foreground">
              아래 정보는 로그인 계정 기준으로 자동 입력됩니다. 연락처가 비어 있으면 입력해 주세요.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-5">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="reg-name">성함</Label>
              <Input id="reg-name" value={displayName} disabled className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reg-email">이메일</Label>
              <Input id="reg-email" type="email" value={email} disabled className="bg-muted/50" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reg-phone">연락처</Label>
              <Input
                id="reg-phone"
                placeholder="계정에 없으면 입력해 주세요"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-[#fdfaf6] p-4 text-xs space-y-3">
            <div className="flex items-start space-x-2">
              <input
                type="checkbox"
                id="privacy"
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="privacy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  개인정보 수집 및 이용 동의 (필수)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  수집항목: 이름, 이메일, 연락처. 이용목적: 이벤트 안내 및 본인확인. 분기별 보관 키(
                  {new Date().getFullYear()}-Q{Math.floor(new Date().getMonth() / 3) + 1})로 관리되며, 정책에 따라
                  주기적으로 삭제할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground px-1">
            * 신청 후 취소는 마이페이지에서 가능합니다.
            <br />* 강연 1일 전까지 취소하지 않을 경우 노쇼로 간주될 수 있습니다.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleRegister} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : '신청하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

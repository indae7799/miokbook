'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Truck, Clock, Save, Info } from 'lucide-react';
import { queryKeys } from '@/lib/queryKeys';

interface StoreSettings {
  storeName: string;
  ceoName: string;
  businessNumber: string;
  address: string;
  phone: string;
  email: string;
  shippingFee: number;
  freeShippingThreshold: number;
  operatingHours: string;
  returnPeriodDays: number;
  noticeText: string;
}

const DEFAULTS: StoreSettings = {
  storeName: '미옥서원',
  ceoName: '',
  businessNumber: '',
  address: '',
  phone: '',
  email: '',
  shippingFee: 2500,
  freeShippingThreshold: 15000,
  operatingHours: '월-금 09:00-18:00',
  returnPeriodDays: 7,
  noticeText: '',
};

async function fetchSettings(token: string): Promise<StoreSettings> {
  const res = await fetch('/api/admin/settings', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('설정을 불러오지 못했습니다.');
  return res.json();
}

async function patchSettings(token: string, data: Partial<StoreSettings>): Promise<void> {
  const res = await fetch('/api/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? '저장 실패');
  }
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
        <Icon className="size-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[160px_1fr] sm:items-start sm:gap-4">
      <div className="pt-2.5">
        <Label className="text-xs font-semibold text-gray-500">{label}</Label>
        {hint && <p className="text-[11px] text-gray-300 mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<StoreSettings>(DEFAULTS);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchSettings(token);
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data) setForm({ ...DEFAULTS, ...data });
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (fields: Partial<StoreSettings>) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      await patchSettings(token, fields);
    },
    onSuccess: () => {
      toast.success('설정이 저장되었습니다.');
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings() });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

  const set = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saving = mutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse max-w-2xl">
        <div className="h-7 w-32 bg-gray-100 rounded" />
        {[1, 2, 3].map(n => <div key={n} className="h-48 rounded-2xl bg-gray-100" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">쇼핑몰 설정</h1>
        <p className="text-sm text-gray-400 mt-0.5">기본 정보, 배송비, 운영 정책을 설정합니다.</p>
      </div>

      {/* 기본 정보 */}
      <SectionCard title="기본 정보" icon={Store}>
        <FieldRow label="상호명">
          <Input value={form.storeName} onChange={e => set('storeName', e.target.value)}
            className="h-10 rounded-xl" placeholder="미옥서원" />
        </FieldRow>
        <FieldRow label="대표자명">
          <Input value={form.ceoName} onChange={e => set('ceoName', e.target.value)}
            className="h-10 rounded-xl" placeholder="홍길동" />
        </FieldRow>
        <FieldRow label="사업자등록번호">
          <Input value={form.businessNumber} onChange={e => set('businessNumber', e.target.value)}
            className="h-10 rounded-xl" placeholder="000-00-00000" />
        </FieldRow>
        <FieldRow label="주소">
          <Input value={form.address} onChange={e => set('address', e.target.value)}
            className="h-10 rounded-xl" placeholder="서울시 ..." />
        </FieldRow>
        <FieldRow label="전화번호">
          <Input value={form.phone} onChange={e => set('phone', e.target.value)}
            className="h-10 rounded-xl" placeholder="02-0000-0000" />
        </FieldRow>
        <FieldRow label="이메일">
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="h-10 rounded-xl" placeholder="info@miokbooks.com" />
        </FieldRow>
        <div className="flex justify-end pt-1">
          <Button size="sm" disabled={saving}
            onClick={() => mutation.mutate({
              storeName: form.storeName, ceoName: form.ceoName,
              businessNumber: form.businessNumber, address: form.address,
              phone: form.phone, email: form.email,
            })}
            className="h-9 px-4 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-semibold">
            <Save className="size-3.5 mr-1.5" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </SectionCard>

      {/* 배송 설정 */}
      <SectionCard title="배송 설정" icon={Truck}>
        <FieldRow label="기본 배송비" hint="원 단위 숫자">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="number" min={0} value={form.shippingFee}
              onChange={e => set('shippingFee', Number(e.target.value))}
              className="h-10 rounded-xl w-36" />
            <span className="text-sm text-gray-400">원</span>
          </div>
        </FieldRow>
        <FieldRow label="무료배송 기준" hint="이 금액 이상 주문 시 무료">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="number" min={0} value={form.freeShippingThreshold}
              onChange={e => set('freeShippingThreshold', Number(e.target.value))}
              className="h-10 rounded-xl w-36" />
            <span className="text-sm text-gray-400">원 이상</span>
          </div>
        </FieldRow>
        <div className="flex justify-end pt-1">
          <Button size="sm" disabled={saving}
            onClick={() => mutation.mutate({
              shippingFee: form.shippingFee,
              freeShippingThreshold: form.freeShippingThreshold,
            })}
            className="h-9 px-4 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-semibold">
            <Save className="size-3.5 mr-1.5" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </SectionCard>

      {/* 운영 정보 */}
      <SectionCard title="운영 정보" icon={Clock}>
        <FieldRow label="운영 시간">
          <Input value={form.operatingHours} onChange={e => set('operatingHours', e.target.value)}
            className="h-10 rounded-xl" placeholder="월-금 09:00-18:00" />
        </FieldRow>
        <FieldRow label="반품 가능 기간" hint="구매일로부터">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="number" min={1} max={30} value={form.returnPeriodDays}
              onChange={e => set('returnPeriodDays', Number(e.target.value))}
              className="h-10 rounded-xl w-24" />
            <span className="text-sm text-gray-400">일 이내</span>
          </div>
        </FieldRow>
        <FieldRow label="공지사항" hint="홈 또는 주문 페이지 안내문">
          <textarea
            value={form.noticeText}
            onChange={e => set('noticeText', e.target.value)}
            rows={3}
            placeholder="예: 설 연휴 기간(1/28~2/2) 배송이 지연될 수 있습니다."
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 resize-none bg-gray-50/50"
          />
        </FieldRow>
        <div className="flex justify-end pt-1">
          <Button size="sm" disabled={saving}
            onClick={() => mutation.mutate({
              operatingHours: form.operatingHours,
              returnPeriodDays: form.returnPeriodDays,
              noticeText: form.noticeText,
            })}
            className="h-9 px-4 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-semibold">
            <Save className="size-3.5 mr-1.5" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </SectionCard>

      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-700">
        <Info className="size-4 shrink-0 mt-0.5" />
        <p>배송비·무료배송 기준을 변경하면 다음 주문부터 적용됩니다. 진행 중인 주문에는 영향 없습니다.</p>
      </div>
    </div>
  );
}

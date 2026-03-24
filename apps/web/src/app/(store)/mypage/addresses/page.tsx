'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Plus, Star, Trash2, Edit2, ChevronLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SavedAddress {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  zip_code: string;
  address: string;
  detail_address: string | null;
  is_default: boolean;
  created_at: string;
}

interface AddressForm {
  label: string;
  name: string;
  phone: string;
  zipCode: string;
  address: string;
  detailAddress: string;
  isDefault: boolean;
}

const emptyForm: AddressForm = {
  label: '',
  name: '',
  phone: '',
  zipCode: '',
  address: '',
  detailAddress: '',
  isDefault: false,
};

function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if ((window as any).daum?.Postcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

export default function MypageAddressesPage() {
  const user = useAuthStore((s) => s.user);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/shipping-addresses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAddresses(await res.json());
    } catch {}
    setIsLoading(false);
  }, [user]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  const handleAddressSearch = useCallback(async () => {
    try {
      await loadDaumPostcodeScript();
      const daum = (window as any).daum;
      if (!daum?.Postcode) return;
      new daum.Postcode({
        oncomplete: (data: { zonecode: string; address: string; buildingName?: string; apartment?: string }) => {
          const extra = data.buildingName && data.apartment === 'Y' ? ` (${data.buildingName})` : '';
          setForm((prev) => ({ ...prev, zipCode: data.zonecode, address: `${data.address}${extra}` }));
        },
      }).open();
    } catch {}
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, isDefault: addresses.length === 0 });
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = (addr: SavedAddress) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label ?? '',
      name: addr.name,
      phone: addr.phone,
      zipCode: addr.zip_code,
      address: addr.address,
      detailAddress: addr.detail_address ?? '',
      isDefault: addr.is_default,
    });
    setFormError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) return setFormError('수령인 이름을 입력해 주세요.');
    if (!form.phone.trim()) return setFormError('연락처를 입력해 주세요.');
    if (!form.zipCode || !form.address) return setFormError('주소를 검색해 주세요.');

    setIsSaving(true);
    setFormError(null);
    try {
      const token = await user.getIdToken();
      const payload = {
        label: form.label.trim() || undefined,
        name: form.name.trim(),
        phone: form.phone.trim(),
        zipCode: form.zipCode,
        address: form.address,
        detailAddress: form.detailAddress.trim() || undefined,
        isDefault: form.isDefault,
      };

      const res = editingId
        ? await fetch(`/api/shipping-addresses/${editingId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/shipping-addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        setFormError('저장에 실패했습니다. 다시 시도해 주세요.');
        return;
      }

      setShowForm(false);
      await fetchAddresses();
    } catch {
      setFormError('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch(`/api/shipping-addresses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isDefault: true }),
      });
      await fetchAddresses();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('이 배송지를 삭제할까요?')) return;
    setDeletingId(id);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/shipping-addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchAddresses();
    } catch {}
    setDeletingId(null);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="-ml-2">
              <Link href="/mypage"><ChevronLeft className="size-5" /></Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">배송지 관리</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">기본 배송지는 결제 시 자동으로 입력됩니다.</p>
            </div>
          </div>
          {!showForm && (
            <Button size="sm" onClick={openAddForm} className="gap-1.5 bg-[#4A1728] text-white hover:bg-[#3a1120]">
              <Plus className="size-4" />
              새 배송지 추가
            </Button>
          )}
        </div>

        {/* 추가/수정 폼 */}
        {showForm && (
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="font-semibold text-foreground">{editingId ? '배송지 수정' : '새 배송지 추가'}</h2>

            <div>
              <Label className="mb-1.5 block text-sm font-medium">배송지 별칭 (선택)</Label>
              <Input
                placeholder="예: 집, 회사"
                value={form.label}
                onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block text-sm font-medium">수령인 <span className="text-[#4A1728]">*</span></Label>
                <Input
                  placeholder="이름"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium">연락처 <span className="text-[#4A1728]">*</span></Label>
                <Input
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-sm font-medium">주소 <span className="text-[#4A1728]">*</span></Label>
              <div className="flex gap-2 mb-2">
                <Input readOnly placeholder="우편번호" value={form.zipCode} className="w-32 bg-muted/40" />
                <Button type="button" variant="outline" size="sm" onClick={handleAddressSearch} className="shrink-0">
                  주소 검색
                </Button>
              </div>
              <Input readOnly placeholder="기본 주소" value={form.address} className="mb-2 bg-muted/40" />
              <Input
                placeholder="상세 주소 (동/호수 등)"
                value={form.detailAddress}
                onChange={(e) => setForm((p) => ({ ...p, detailAddress: e.target.value }))}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setForm((p) => ({ ...p, isDefault: e.target.checked }))}
                className="size-4 rounded accent-[#4A1728]"
              />
              <span className="text-sm text-foreground">기본 배송지로 설정</span>
            </label>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-[#4A1728] text-white hover:bg-[#3a1120]"
              >
                {isSaving ? '저장 중...' : '저장'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isSaving}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        )}

        {/* 배송지 목록 */}
        {isLoading ? (
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            불러오는 중...
          </div>
        ) : addresses.length === 0 && !showForm ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center">
            <MapPin className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="font-medium text-foreground">저장된 배송지가 없습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">새 배송지를 추가하면 결제 시 자동으로 입력됩니다.</p>
            <Button onClick={openAddForm} className="mt-4 bg-[#4A1728] text-white hover:bg-[#3a1120]">
              <Plus className="mr-1.5 size-4" />
              배송지 추가하기
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr) => (
              <article
                key={addr.id}
                className={[
                  'rounded-lg border bg-card p-5 transition-colors',
                  addr.is_default ? 'border-[#4A1728]/40 bg-[#4A1728]/[0.03]' : 'border-border',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {addr.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#4A1728] px-2 py-0.5 text-[11px] font-medium text-white">
                        <Star className="size-2.5 fill-white" />
                        기본
                      </span>
                    )}
                    {addr.label && (
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                        {addr.label}
                      </span>
                    )}
                    <span className="font-semibold text-foreground">{addr.name}</span>
                    <span className="text-sm text-muted-foreground">{addr.phone}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleSetDefault(addr.id)}
                      >
                        기본으로 설정
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditForm(addr)}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(addr.id)}
                      disabled={deletingId === addr.id}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 text-sm text-foreground">
                  <p>({addr.zip_code}) {addr.address}</p>
                  {addr.detail_address && (
                    <p className="mt-0.5 text-muted-foreground">{addr.detail_address}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

'use client';

import type { Dispatch, SetStateAction } from 'react';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizePopupDock, POPUP_DOCK_LABEL, type PopupDock } from '@/lib/popup-dock';
import {
  MARKETING_IMAGE_PRESETS,
  POPUP_PX_INPUT_MAX,
  getPopupSlotLabel,
} from './marketing.constants';
import type { PopupData } from './marketing.types';

interface PopupManagerSectionProps {
  popups: PopupData[];
  popupForm: PopupData;
  setPopupForm: Dispatch<SetStateAction<PopupData>>;
  popupUploading: boolean;
  setPopupUploading: Dispatch<SetStateAction<boolean>>;
  isEditingPopup: boolean;
  isPending: boolean;
  onEditPopup: (item: PopupData) => void;
  onDeletePopup: (id?: string) => void;
  onSavePopup: () => void;
}

const QUICK_LINK_OPTIONS = [
  { label: '홈', value: '/' },
  { label: '도서', value: '/books' },
  { label: '북콘서트', value: '/concerts' },
  { label: '이벤트', value: '/events' },
  { label: '콘텐츠', value: '/content' },
] as const;

export default function PopupManagerSection({
  popups,
  popupForm,
  setPopupForm,
  popupUploading,
  setPopupUploading,
  isEditingPopup,
  isPending,
  onEditPopup,
  onDeletePopup,
  onSavePopup,
}: PopupManagerSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-medium mb-3">팝업 관리</h2>
      <p className="text-sm text-muted-foreground mb-4">
        팝업마다 <strong className="text-foreground">가로 배치(왼쪽 / 가운데 / 오른쪽)</strong>를 지정할 수 있습니다. 가로형·세로형을 나눠 두면 같은 줄에서도 서로 다른 구역에 두어 보기 좋게 맞출 수 있습니다. 등록 순서(슬롯)는 목록 정렬·기본 배치에만 쓰이며, 기본 배치는 슬롯 0→왼쪽, 1→가운데, 2→오른쪽입니다. 이미지를 올리면 <strong className="text-foreground">원본 가로·세로(px)가 자동 입력</strong>됩니다. 스토어 최대 너비는 화면의 약 50%이며, 활성 구역만 균등 너비로 나뉩니다. 이미지는 비율 틀에 <strong className="text-foreground">cover</strong>로 맞춥니다.
      </p>

      {popups.length > 0 ? (
        <ul className="space-y-3 mb-5">
          {popups.map((item) => (
            <li key={item.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
              <div className="relative w-20 h-28 shrink-0 rounded overflow-hidden bg-muted">
                {item.imageUrl?.trim() ? (
                  <AdminPreviewImage src={item.imageUrl} alt="" fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">No Image</div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="break-all">{item.linkUrl ?? '/'}</p>
                <p className="text-muted-foreground">
                  순서: {getPopupSlotLabel(item.slotIndex ?? 0)} · 배치:{' '}
                  {POPUP_DOCK_LABEL[normalizePopupDock(item.dock, item.slotIndex ?? 0)]}
                </p>
                <p className="text-muted-foreground">크기(원본·비율): {item.widthPx ?? 600}×{item.heightPx ?? 400}px</p>
                <p className="text-muted-foreground">상태: {item.isActive === false ? '비활성' : '활성'}</p>
                {item.endDate && <p className="text-muted-foreground">종료일: {String(item.endDate).slice(0, 10)}</p>}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => onEditPopup(item)} disabled={isPending}>
                수정
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => onDeletePopup(item.id)} disabled={isPending}>
                삭제
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground mb-5">등록된 팝업이 없습니다.</p>
      )}

      <div className="space-y-3 w-full max-w-3xl">
        <div>
          <label className="text-sm text-muted-foreground">팝업 이미지 (권장 600×800px · 5MB · JPEG/PNG/WEBP)</label>
          {popupForm.imageUrl?.trim() ? (
            <div className="mt-3 w-full max-w-[280px] overflow-hidden rounded-[20px] border border-border bg-card shadow-lg">
              <div className="border-b border-border bg-white/80 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                팝업 실사용 미리보기
              </div>
              <div className="relative" style={{ aspectRatio: `${popupForm.widthPx ?? 600} / ${popupForm.heightPx ?? 800}` }}>
                <AdminPreviewImage src={popupForm.imageUrl} alt="팝업 미리보기" fill className="object-cover" sizes="280px" />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border bg-background px-3 py-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-8 w-14 rounded-md bg-secondary" />
              </div>
            </div>
          ) : null}
          <ImagePreviewUploader
            storagePath={`popups/${Date.now()}.jpg`}
            onUploadComplete={(url) => setPopupForm((p) => ({ ...p, imageUrl: url }))}
            onUploadingChange={setPopupUploading}
            enableCrop
            cropAspectRatio={MARKETING_IMAGE_PRESETS.popup.cropAspectRatio}
            previewAspectRatio={MARKETING_IMAGE_PRESETS.popup.previewAspectRatio}
            cropTitle={MARKETING_IMAGE_PRESETS.popup.cropTitle}
            cropDescription={MARKETING_IMAGE_PRESETS.popup.cropDescription}
            outputWidth={MARKETING_IMAGE_PRESETS.popup.outputWidth}
            outputHeight={MARKETING_IMAGE_PRESETS.popup.outputHeight}
            onImageDimensions={(width, height) => {
              setPopupForm((p) => ({ ...p, widthPx: width, heightPx: height }));
            }}
          />
          {popupForm.imageUrl && (
            <p className="text-xs text-muted-foreground mt-1 break-all">
              {isEditingPopup ? '수정 중 이미지' : '업로드 예정'}: {popupForm.imageUrl}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">클릭 링크 URL</label>
          <Input
            type="url"
            value={popupForm.linkUrl ?? ''}
            onChange={(e) => setPopupForm((p) => ({ ...p, linkUrl: e.target.value }))}
            placeholder="https://... 또는 /concerts/slug"
            className="min-h-[48px]"
          />
          <div className="flex flex-wrap gap-1.5">
            {QUICK_LINK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPopupForm((p) => ({ ...p, linkUrl: opt.value }))}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="popup-active"
            checked={popupForm.isActive ?? true}
            onChange={(e) => setPopupForm((p) => ({ ...p, isActive: e.target.checked }))}
            className="min-h-[48px] min-w-[48px]"
          />
          <label htmlFor="popup-active">활성</label>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">노출 종료일 (YYYY-MM-DD)</label>
          <Input
            type="date"
            value={popupForm.endDate ?? ''}
            onChange={(e) => setPopupForm((p) => ({ ...p, endDate: e.target.value || undefined }))}
            className="min-h-[48px]"
          />
        </div>
        {isEditingPopup && (
          <p className="text-sm text-muted-foreground">
            목록 순서: {getPopupSlotLabel(popupForm.slotIndex ?? 0)} (추가 순서로 고정)
          </p>
        )}
        <div>
          <label className="text-sm text-muted-foreground" htmlFor="popup-dock">
            스토어 가로 배치
          </label>
          <select
            id="popup-dock"
            className="mt-1 min-h-[48px] w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={normalizePopupDock(popupForm.dock, isEditingPopup ? (popupForm.slotIndex ?? 0) : popups.length)}
            onChange={(e) =>
              setPopupForm((p) => ({ ...p, dock: e.target.value as PopupDock }))
            }
          >
            {(Object.keys(POPUP_DOCK_LABEL) as PopupDock[]).map((d) => (
              <option key={d} value={d}>
                {POPUP_DOCK_LABEL[d]}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            새 팝업 기본값은 순서(슬롯)에 따라 좌·중·우가 돌아갑니다. 가로형은 오른쪽, 세로형은 왼쪽처럼 나누면 함께 쓰기 편합니다.
          </p>
        </div>
        <div>
          <label className="text-sm text-muted-foreground">가로(px) — 원본 기준(업로드 시 자동). 1~{POPUP_PX_INPUT_MAX}</label>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={popupForm.widthPx != null ? String(popupForm.widthPx) : ''}
            placeholder="이미지 업로드 시 자동"
            onFocus={(e) => {
              const el = e.target;
              setTimeout(() => el.select(), 0);
            }}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              if (v === '') {
                setPopupForm((p) => ({ ...p, widthPx: undefined }));
                return;
              }
              const n = Number(v);
              if (!Number.isNaN(n)) setPopupForm((p) => ({ ...p, widthPx: n }));
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v === '' || Number.isNaN(Number(v))) {
                setPopupForm((p) => ({ ...p, widthPx: undefined }));
                return;
              }
              const n = Number(v);
              setPopupForm((p) => ({ ...p, widthPx: Math.min(POPUP_PX_INPUT_MAX, Math.max(1, n)) }));
            }}
            className="min-h-[48px]"
          />
        </div>
        <div>
          <label className="text-sm text-muted-foreground">세로(px) — 원본 기준(업로드 시 자동). 수동 시 100 이상 권장</label>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={popupForm.heightPx != null ? String(popupForm.heightPx) : ''}
            placeholder={String(400)}
            onFocus={(e) => {
              const el = e.target;
              setTimeout(() => el.select(), 0);
            }}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              if (v === '') {
                setPopupForm((p) => ({ ...p, heightPx: undefined }));
                return;
              }
              const n = Number(v);
              if (!Number.isNaN(n)) setPopupForm((p) => ({ ...p, heightPx: n }));
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v === '' || Number.isNaN(Number(v))) {
                setPopupForm((p) => ({ ...p, heightPx: undefined }));
                return;
              }
              const n = Number(v);
              setPopupForm((p) => ({ ...p, heightPx: Math.min(POPUP_PX_INPUT_MAX, Math.max(100, n)) }));
            }}
            className="min-h-[48px]"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={onSavePopup} disabled={isPending || popupUploading} className="min-h-[48px]">
            {popupUploading ? '업로드 중…' : isEditingPopup ? '팝업 수정 저장' : '팝업 추가'}
          </Button>
          <Button variant="outline" onClick={() => setPopupForm({})} disabled={isPending} className="min-h-[48px]">
            {isEditingPopup ? '수정 취소' : '입력 초기화'}
          </Button>
        </div>
      </div>
    </section>
  );
}

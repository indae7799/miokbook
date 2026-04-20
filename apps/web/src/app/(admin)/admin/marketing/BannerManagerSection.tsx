'use client';

import type { Dispatch, SetStateAction } from 'react';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import InternalLinkPicker from '@/components/admin/InternalLinkPicker';
import { Button } from '@/components/ui/button';
import {
  POSITION_OPTIONS,
  getBannerPreviewLabel,
  getBannerRatioGuidance,
  getBannerRatioLabel,
} from './marketing.constants';
import type { Banner, BannerImageDimensions, CropPreset } from './marketing.types';

interface BannerManagerSectionProps {
  banners: Banner[];
  addingBanner: boolean;
  setAddingBanner: Dispatch<SetStateAction<boolean>>;
  bannerUploading: boolean;
  setBannerUploading: Dispatch<SetStateAction<boolean>>;
  newBannerImageDimensions: BannerImageDimensions | null;
  setNewBannerImageDimensions: Dispatch<SetStateAction<BannerImageDimensions | null>>;
  newBanner: Partial<Banner>;
  setNewBanner: Dispatch<SetStateAction<Partial<Banner>>>;
  newBannerCropPreset: CropPreset;
  newBannerExpectedSize: string;
  newBannerTargetRatio: number;
  newBannerActualRatio: number | null;
  showBannerRatioWarning: boolean;
  isPending: boolean;
  onAddBanner: () => void;
  onDeleteBanner: (id: string) => void;
}

export default function BannerManagerSection({
  banners,
  addingBanner,
  setAddingBanner,
  bannerUploading,
  setBannerUploading,
  newBannerImageDimensions,
  setNewBannerImageDimensions,
  newBanner,
  setNewBanner,
  newBannerCropPreset,
  newBannerExpectedSize,
  newBannerTargetRatio,
  newBannerActualRatio,
  showBannerRatioWarning,
  isPending,
  onAddBanner,
  onDeleteBanner,
}: BannerManagerSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-medium mb-3">배너 목록 (홈 상단 메인 캐러셀)</h2>
      <p className="text-xs text-muted-foreground mb-4">
        ※ 현재 홈 레이아웃은 7:3 그리드로, 메인 배너(7) 옆에 최신 이벤트(3)가 나란히 노출됩니다.
      </p>
      {banners.length === 0 && !addingBanner ? (
        <p className="text-muted-foreground text-sm mb-2">등록된 배너가 없습니다. 아래 &apos;배너 추가&apos;로 첫 메인 배너를 등록하면 스토어 홈 상단에 바로 노출됩니다.</p>
      ) : (
        <ul className="space-y-3">
          {banners.map((b) => (
            <li key={b.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
              <div className="relative w-24 h-14 shrink-0 rounded overflow-hidden bg-muted">
                {b.imageUrl?.trim() ? (
                  <AdminPreviewImage src={b.imageUrl} alt="" fill className="object-cover" sizes="96px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">No Image</div>
                )}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p>{b.linkUrl}</p>
                <p className="text-muted-foreground">{POSITION_OPTIONS.find((p) => p.value === b.position)?.label ?? b.position}</p>
              </div>
              <Button type="button" variant="destructive" size="sm" onClick={() => onDeleteBanner(b.id)} disabled={isPending}>
                삭제
              </Button>
            </li>
          ))}
        </ul>
      )}

      {addingBanner ? (
        <div className="mt-4 p-4 rounded-lg border border-border space-y-3">
          <p className="text-sm font-medium">새 배너 (이미지 5MB·JPEG/PNG/WEBP)</p>
          <p className="text-xs text-muted-foreground">권장 크기: {newBannerExpectedSize} / 권장 비율: {getBannerRatioLabel(newBannerTargetRatio)}</p>
          <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            <p>{getBannerRatioGuidance(newBanner.position)}</p>
            <p className="mt-1">중요한 텍스트나 인물은 중앙 안전영역에 두는 편이 좋습니다.</p>
            {newBannerImageDimensions ? (
              <p className="mt-1 tabular-nums">
                업로드 원본: {newBannerImageDimensions.width} x {newBannerImageDimensions.height}px / 실제 비율:{' '}
                {getBannerRatioLabel(newBannerActualRatio ?? newBannerTargetRatio)}
              </p>
            ) : null}
            {showBannerRatioWarning ? (
              <p className="mt-1 font-medium text-amber-700">
                현재 원본 비율이 권장 비율과 차이가 커서 실제 메인 노출 시 여백이 크게 보일 수 있습니다.
              </p>
            ) : null}
          </div>
          {newBanner.imageUrl?.trim() ? (
            <div className="overflow-hidden rounded-[18px] border border-border bg-[#faf7f2] shadow-sm">
              <div className="flex items-center justify-between border-b border-border/70 bg-white/80 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                <span>배너 미리보기</span>
                <span>{getBannerPreviewLabel(newBanner.position)}</span>
              </div>
              <div
                className={`relative overflow-hidden bg-muted ${newBanner.position === 'sidebar' ? 'mx-auto w-[180px]' : 'w-full'}`}
                style={{ aspectRatio: `${newBannerCropPreset.cropAspectRatio}` }}
              >
                <AdminPreviewImage src={String(newBanner.imageUrl)} alt="새 배너 미리보기" fill className="object-contain" sizes="480px" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 rounded-md bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white">
                  {getBannerPreviewLabel(newBanner.position)}
                </div>
              </div>
            </div>
          ) : null}
          <ImagePreviewUploader
            storagePath={`banners/${Date.now()}.jpg`}
            onUploadComplete={(url) => setNewBanner((prev) => ({ ...prev, imageUrl: url }))}
            onUploadingChange={setBannerUploading}
            onImageDimensions={(width, height) => setNewBannerImageDimensions({ width, height })}
            enableCrop
            cropMode="after_upload"
            cropAspectRatio={newBannerCropPreset.cropAspectRatio}
            previewAspectRatio={newBannerCropPreset.previewAspectRatio}
            cropTitle={newBannerCropPreset.cropTitle}
            cropDescription={newBannerCropPreset.cropDescription}
            outputWidth={newBannerCropPreset.outputWidth}
            outputHeight={newBannerCropPreset.outputHeight}
          />
          <div>
            <label className="text-sm text-muted-foreground">링크</label>
            <InternalLinkPicker
              value={newBanner.linkUrl ?? '/'}
              onChange={(url) => setNewBanner((prev) => ({ ...prev, linkUrl: url }))}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">위치</label>
            <select
              value={newBanner.position ?? 'main_hero'}
              onChange={(e) => setNewBanner((prev) => ({ ...prev, position: e.target.value }))}
              className="min-h-[48px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {POSITION_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={onAddBanner} disabled={isPending || !newBanner.imageUrl || bannerUploading}>
              {bannerUploading ? '업로드 중…' : '저장'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAddingBanner(false);
                setNewBannerImageDimensions(null);
              }}
            >
              취소
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="mt-3 min-h-[48px]"
          onClick={() => {
            setAddingBanner(true);
            setNewBannerImageDimensions(null);
          }}
        >
          배너 추가
        </Button>
      )}
    </section>
  );
}

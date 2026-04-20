'use client';

import type { Dispatch, SetStateAction } from 'react';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import InternalLinkPicker from '@/components/admin/InternalLinkPicker';
import { Button } from '@/components/ui/button';
import { MARKETING_IMAGE_PRESETS } from './marketing.constants';
import type { StoreHeroImage } from './marketing.types';

interface MainBottomBannersSectionProps {
  mainBottomLeftForm: StoreHeroImage;
  setMainBottomLeftForm: Dispatch<SetStateAction<StoreHeroImage>>;
  mainBottomRightForm: StoreHeroImage;
  setMainBottomRightForm: Dispatch<SetStateAction<StoreHeroImage>>;
  mainBottomLeftUploading: boolean;
  setMainBottomLeftUploading: Dispatch<SetStateAction<boolean>>;
  mainBottomRightUploading: boolean;
  setMainBottomRightUploading: Dispatch<SetStateAction<boolean>>;
  isPending: boolean;
  onSaveMainBottomLeft: () => void;
  onSaveMainBottomRight: () => void;
}

export default function MainBottomBannersSection({
  mainBottomLeftForm,
  setMainBottomLeftForm,
  mainBottomRightForm,
  setMainBottomRightForm,
  mainBottomLeftUploading,
  setMainBottomLeftUploading,
  mainBottomRightUploading,
  setMainBottomRightUploading,
  isPending,
  onSaveMainBottomLeft,
  onSaveMainBottomRight,
}: MainBottomBannersSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-medium mb-3">메인 하단 배너 (MD의 선택 하단)</h2>
      <p className="text-sm text-muted-foreground mb-4">
        MD의 선택 섹션 하단 좌우 2개 슬롯입니다. 권장 600×200px.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">좌측</p>
          {mainBottomLeftForm.imageUrl?.trim() && (
            <div className="overflow-hidden rounded-[18px] border border-border bg-[#faf7f2] shadow-sm">
              <div className="border-b border-border/70 bg-white/80 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                메인 하단 좌측 배너 미리보기
              </div>
              <div className="relative w-full aspect-[3/1] overflow-hidden bg-muted shrink-0">
                <AdminPreviewImage src={mainBottomLeftForm.imageUrl} alt="좌측 배너" fill className="object-cover" sizes="400px" />
                <div className="absolute bottom-3 left-3 rounded-md bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white">
                  MD의 선택 하단
                </div>
              </div>
            </div>
          )}
          <ImagePreviewUploader
            storagePath={`banners/main-bottom-left-${Date.now()}.jpg`}
            onUploadComplete={(url) => setMainBottomLeftForm((p) => ({ ...p, imageUrl: url }))}
            onUploadingChange={setMainBottomLeftUploading}
            enableCrop
            cropAspectRatio={MARKETING_IMAGE_PRESETS.mainBottomBanner.cropAspectRatio}
            previewAspectRatio={MARKETING_IMAGE_PRESETS.mainBottomBanner.previewAspectRatio}
            cropTitle={MARKETING_IMAGE_PRESETS.mainBottomBanner.cropTitle}
            cropDescription={MARKETING_IMAGE_PRESETS.mainBottomBanner.cropDescription}
            outputWidth={MARKETING_IMAGE_PRESETS.mainBottomBanner.outputWidth}
            outputHeight={MARKETING_IMAGE_PRESETS.mainBottomBanner.outputHeight}
          />
          <div>
            <label className="text-sm text-muted-foreground">링크</label>
            <InternalLinkPicker
              value={mainBottomLeftForm.linkUrl ?? '/'}
              onChange={(url) => setMainBottomLeftForm((p) => ({ ...p, linkUrl: url }))}
            />
          </div>
          <Button onClick={onSaveMainBottomLeft} disabled={isPending || mainBottomLeftUploading || !mainBottomLeftForm.imageUrl?.trim()}>
            {mainBottomLeftUploading ? '업로드 중…' : '좌측 저장'}
          </Button>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">우측</p>
          {mainBottomRightForm.imageUrl?.trim() && (
            <div className="overflow-hidden rounded-[18px] border border-border bg-[#faf7f2] shadow-sm">
              <div className="border-b border-border/70 bg-white/80 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                메인 하단 우측 배너 미리보기
              </div>
              <div className="relative w-full aspect-[3/1] overflow-hidden bg-muted shrink-0">
                <AdminPreviewImage src={mainBottomRightForm.imageUrl} alt="우측 배너" fill className="object-cover" sizes="400px" />
                <div className="absolute bottom-3 left-3 rounded-md bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white">
                  MD의 선택 하단
                </div>
              </div>
            </div>
          )}
          <ImagePreviewUploader
            storagePath={`banners/main-bottom-right-${Date.now()}.jpg`}
            onUploadComplete={(url) => setMainBottomRightForm((p) => ({ ...p, imageUrl: url }))}
            onUploadingChange={setMainBottomRightUploading}
            enableCrop
            cropAspectRatio={MARKETING_IMAGE_PRESETS.mainBottomBanner.cropAspectRatio}
            previewAspectRatio={MARKETING_IMAGE_PRESETS.mainBottomBanner.previewAspectRatio}
            cropTitle={MARKETING_IMAGE_PRESETS.mainBottomBanner.cropTitle}
            cropDescription={MARKETING_IMAGE_PRESETS.mainBottomBanner.cropDescription}
            outputWidth={MARKETING_IMAGE_PRESETS.mainBottomBanner.outputWidth}
            outputHeight={MARKETING_IMAGE_PRESETS.mainBottomBanner.outputHeight}
          />
          <div>
            <label className="text-sm text-muted-foreground">링크</label>
            <InternalLinkPicker
              value={mainBottomRightForm.linkUrl ?? '/'}
              onChange={(url) => setMainBottomRightForm((p) => ({ ...p, linkUrl: url }))}
            />
          </div>
          <Button onClick={onSaveMainBottomRight} disabled={isPending || mainBottomRightUploading || !mainBottomRightForm.imageUrl?.trim()}>
            {mainBottomRightUploading ? '업로드 중…' : '우측 저장'}
          </Button>
        </div>
      </div>
    </section>
  );
}

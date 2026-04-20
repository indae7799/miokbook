'use client';

import type { Dispatch, SetStateAction } from 'react';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import InternalLinkPicker from '@/components/admin/InternalLinkPicker';
import { Button } from '@/components/ui/button';
import { MARKETING_IMAGE_PRESETS } from './marketing.constants';
import type { StoreHeroImage } from './marketing.types';

interface StoreHeroSectionProps {
  storeHeroForm: StoreHeroImage;
  setStoreHeroForm: Dispatch<SetStateAction<StoreHeroImage>>;
  storeHeroUploading: boolean;
  setStoreHeroUploading: Dispatch<SetStateAction<boolean>>;
  isPending: boolean;
  onSaveStoreHero: () => void;
  onDeleteStoreHero: () => void;
}

export default function StoreHeroSection({
  storeHeroForm,
  setStoreHeroForm,
  storeHeroUploading,
  setStoreHeroUploading,
  isPending,
  onSaveStoreHero,
  onDeleteStoreHero,
}: StoreHeroSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-lg font-medium mb-3">서점 이미지 (탭 위 대문)</h2>
      <p className="text-sm text-muted-foreground mb-4">
        헤더 바로 아래, 탭(신간/MD의선택 등) 위에 노출되는 대문 이미지 1장입니다. 권장 가로 1600px (높이 480px, 10:3 비율 권장).
      </p>
      <div className="flex flex-wrap gap-4 items-start">
        {storeHeroForm.imageUrl?.trim() && (
          <div className="w-full max-w-2xl overflow-hidden rounded-[22px] border border-border bg-[#f6f0e8] shadow-sm shrink-0">
            <div className="flex items-center justify-between border-b border-border/70 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d6e5a]">
              <span>Home Preview</span>
              <span>Hero</span>
            </div>
            <div className="relative h-[200px]">
              <AdminPreviewImage
                src={storeHeroForm.imageUrl}
                alt="서점 이미지"
                fill
                className="object-cover object-[center_65%]"
                sizes="800px"
              />
              <div className="absolute inset-x-0 top-0 h-12 bg-white/50 backdrop-blur-[1px]" />
              <div className="absolute left-4 top-4 rounded-full border border-white/60 bg-black/20 px-3 py-1 text-[10px] font-semibold text-white">
                Header
              </div>
              <div className="absolute bottom-4 left-4 rounded-md bg-black/45 px-3 py-2 text-xs font-medium text-white">
                메인 상단 대문 영역
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3 min-w-[280px]">
          <ImagePreviewUploader
            storagePath={`store-hero/${Date.now()}.jpg`}
            onUploadComplete={(url) => setStoreHeroForm((p) => ({ ...p, imageUrl: url }))}
            onUploadingChange={setStoreHeroUploading}
            enableCrop
            cropMode="after_upload"
            cropAspectRatio={MARKETING_IMAGE_PRESETS.storeHero.cropAspectRatio}
            previewAspectRatio={MARKETING_IMAGE_PRESETS.storeHero.previewAspectRatio}
            cropTitle={MARKETING_IMAGE_PRESETS.storeHero.cropTitle}
            cropDescription={MARKETING_IMAGE_PRESETS.storeHero.cropDescription}
            outputWidth={MARKETING_IMAGE_PRESETS.storeHero.outputWidth}
            outputHeight={MARKETING_IMAGE_PRESETS.storeHero.outputHeight}
          />
          <div>
            <label className="text-sm text-muted-foreground">링크</label>
            <InternalLinkPicker
              value={storeHeroForm.linkUrl ?? '/'}
              onChange={(url) => setStoreHeroForm((p) => ({ ...p, linkUrl: url }))}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onSaveStoreHero} disabled={isPending || storeHeroUploading || !storeHeroForm.imageUrl?.trim()}>
              {storeHeroUploading ? '업로드 중…' : '서점 이미지 저장'}
            </Button>
            {storeHeroForm.imageUrl?.trim() && (
              <Button variant="destructive" onClick={onDeleteStoreHero} disabled={isPending || storeHeroUploading}>
                삭제
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import type { Dispatch, SetStateAction } from 'react';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import InternalLinkPicker from '@/components/admin/InternalLinkPicker';
import { Button } from '@/components/ui/button';
import { MARKETING_IMAGE_PRESETS } from './marketing.constants';
import type { StoreHeroImage } from './marketing.types';

interface HomeBackgroundImagesSectionProps {
  aboutBookstoreImage: StoreHeroImage | null;
  aboutBookstoreForm: StoreHeroImage;
  setAboutBookstoreForm: Dispatch<SetStateAction<StoreHeroImage>>;
  aboutBookstoreUploading: boolean;
  setAboutBookstoreUploading: Dispatch<SetStateAction<boolean>>;
  meetingAtBookstoreImage: { imageUrl: string } | null;
  meetingForm: { imageUrl: string };
  setMeetingForm: Dispatch<SetStateAction<{ imageUrl: string }>>;
  meetingUploading: boolean;
  setMeetingUploading: Dispatch<SetStateAction<boolean>>;
  isPending: boolean;
  onSaveAboutBookstore: () => void;
  onDeleteAboutBookstore: () => void;
  onSaveMeeting: () => void;
  onDeleteMeeting: () => void;
}

export default function HomeBackgroundImagesSection({
  aboutBookstoreImage,
  aboutBookstoreForm,
  setAboutBookstoreForm,
  aboutBookstoreUploading,
  setAboutBookstoreUploading,
  meetingAtBookstoreImage,
  meetingForm,
  setMeetingForm,
  meetingUploading,
  setMeetingUploading,
  isPending,
  onSaveAboutBookstore,
  onDeleteAboutBookstore,
  onSaveMeeting,
  onDeleteMeeting,
}: HomeBackgroundImagesSectionProps) {
  return (
    <>
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-medium mb-1">서점에서의 만남 (대량구매) 배경 이미지</h2>
        <p className="text-xs text-muted-foreground mb-4">홈 중간의 전체 폭 띠배너 배경입니다. 미설정 시 기본 이미지 사용.</p>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            <p className="text-xs font-medium text-muted-foreground mb-2">현재 이미지</p>
            <div className="w-[220px] overflow-hidden rounded-[18px] border border-border bg-[#fbf8f3] shadow-sm">
              <div className="border-b border-border/70 bg-white/80 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                서점 소개 섹션
              </div>
              <div className="relative aspect-[5/3] overflow-hidden bg-muted">
                {aboutBookstoreImage?.imageUrl ? (
                  <AdminPreviewImage src={aboutBookstoreImage.imageUrl} alt="대량구매 배경" fill className="object-cover" sizes="220px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">미설정</div>
                )}
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-white/88 px-3 py-2 text-[11px] leading-4 text-foreground shadow-sm">
                  서점 소개와 링크 버튼이 이 위에 겹쳐집니다.
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">새 이미지 업로드</p>
              <ImagePreviewUploader
                onUploadComplete={(url: string) => setAboutBookstoreForm((p) => ({ ...p, imageUrl: url }))}
                onUploadingChange={setAboutBookstoreUploading}
                storagePath="cms/about-bookstore"
                enableCrop
                cropMode="after_upload"
                cropAspectRatio={MARKETING_IMAGE_PRESETS.aboutBookstore.cropAspectRatio}
                previewAspectRatio={MARKETING_IMAGE_PRESETS.aboutBookstore.previewAspectRatio}
                cropTitle={MARKETING_IMAGE_PRESETS.aboutBookstore.cropTitle}
                cropDescription={MARKETING_IMAGE_PRESETS.aboutBookstore.cropDescription}
                outputWidth={MARKETING_IMAGE_PRESETS.aboutBookstore.outputWidth}
                outputHeight={MARKETING_IMAGE_PRESETS.aboutBookstore.outputHeight}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">클릭 링크</p>
              <InternalLinkPicker
                value={aboutBookstoreForm.linkUrl}
                onChange={(url) => setAboutBookstoreForm((p) => ({ ...p, linkUrl: url }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSaveAboutBookstore} disabled={isPending || aboutBookstoreUploading || !aboutBookstoreForm.imageUrl?.trim()}>
                {aboutBookstoreUploading ? '업로드 중…' : '저장'}
              </Button>
              {aboutBookstoreImage?.imageUrl && (
                <Button variant="outline" onClick={onDeleteAboutBookstore} disabled={isPending}>삭제</Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-medium mb-1">서점에서의 만남 배경 이미지</h2>
        <p className="text-xs text-muted-foreground mb-4">홈 상단 7:3 그리드 우측 이벤트 카드의 배경 이미지입니다. 설정 시 이벤트 등록 이미지 대신 표시됩니다.</p>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="shrink-0">
            <p className="text-xs font-medium text-muted-foreground mb-2">현재 이미지</p>
            <div className="w-[240px] overflow-hidden rounded-[18px] border border-border bg-[#fbf8f3] shadow-sm">
              <div className="border-b border-border/70 bg-white/80 px-3 py-2 text-[11px] font-medium text-muted-foreground">
                서점에서의 만남 섹션
              </div>
              <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                {meetingAtBookstoreImage?.imageUrl ? (
                  <AdminPreviewImage src={meetingAtBookstoreImage.imageUrl} alt="서점에서의 만남 배경" fill className="object-cover" sizes="240px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">미설정</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />
                <div className="absolute bottom-3 right-3 w-[92px] overflow-hidden rounded-xl border border-white/50 bg-white shadow-sm">
                  <div className="aspect-[4/5] bg-white/90" />
                  <div className="space-y-1 p-2">
                    <div className="h-2 rounded bg-muted" />
                    <div className="h-2 w-2/3 rounded bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">새 이미지 업로드 (권장 800×450px, 16:9)</p>
              <ImagePreviewUploader
                onUploadComplete={(url: string) => setMeetingForm({ imageUrl: url })}
                onUploadingChange={setMeetingUploading}
                storagePath="cms/meeting-at-bookstore"
                enableCrop
                cropAspectRatio={MARKETING_IMAGE_PRESETS.meetingAtBookstore.cropAspectRatio}
                previewAspectRatio={MARKETING_IMAGE_PRESETS.meetingAtBookstore.previewAspectRatio}
                cropTitle={MARKETING_IMAGE_PRESETS.meetingAtBookstore.cropTitle}
                cropDescription={MARKETING_IMAGE_PRESETS.meetingAtBookstore.cropDescription}
                outputWidth={MARKETING_IMAGE_PRESETS.meetingAtBookstore.outputWidth}
                outputHeight={MARKETING_IMAGE_PRESETS.meetingAtBookstore.outputHeight}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={onSaveMeeting} disabled={isPending || meetingUploading || !meetingForm.imageUrl?.trim()}>
                {meetingUploading ? '업로드 중…' : '저장'}
              </Button>
              {meetingAtBookstoreImage?.imageUrl && (
                <Button variant="outline" onClick={onDeleteMeeting} disabled={isPending}>삭제</Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

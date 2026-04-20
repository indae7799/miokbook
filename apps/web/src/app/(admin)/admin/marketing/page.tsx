'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { useState, useEffect } from 'react';
import { clampStoredPopupDimensions } from '@/lib/popup-dimensions';
import { normalizePopupDock } from '@/lib/popup-dock';
import { fetchCms, patchCms } from './marketing.api';
import {
  POSITION_OPTIONS,
  MARKETING_IMAGE_PRESETS,
  getBannerCropPreset,
} from './marketing.constants';
import type { Banner, BannerImageDimensions, CmsPatchPayload, PopupData, StoreHeroImage } from './marketing.types';
import BannerManagerSection from './BannerManagerSection';
import PopupManagerSection from './PopupManagerSection';
import StoreHeroSection from './StoreHeroSection';
import MainBottomBannersSection from './MainBottomBannersSection';
import HomeBackgroundImagesSection from './HomeBackgroundImagesSection';

export default function AdminMarketingPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [addingBanner, setAddingBanner] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [newBannerImageDimensions, setNewBannerImageDimensions] = useState<BannerImageDimensions | null>(null);
  const [popupUploading, setPopupUploading] = useState(false);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({
    linkUrl: '/',
    position: 'main_hero',
    isActive: true,
    order: 0,
  });
  const [popupForm, setPopupForm] = useState<PopupData>({});
  const [storeHeroUploading, setStoreHeroUploading] = useState(false);
  const [storeHeroForm, setStoreHeroForm] = useState<StoreHeroImage>({ imageUrl: '', linkUrl: '/' });
  const [mainBottomLeftUploading, setMainBottomLeftUploading] = useState(false);
  const [mainBottomRightUploading, setMainBottomRightUploading] = useState(false);
  const [mainBottomLeftForm, setMainBottomLeftForm] = useState<StoreHeroImage>({ imageUrl: '', linkUrl: '/' });
  const [mainBottomRightForm, setMainBottomRightForm] = useState<StoreHeroImage>({ imageUrl: '', linkUrl: '/' });
  const [aboutBookstoreUploading, setAboutBookstoreUploading] = useState(false);
  const [aboutBookstoreForm, setAboutBookstoreForm] = useState<StoreHeroImage>({ imageUrl: '', linkUrl: '/bulk-order' });
  const [meetingUploading, setMeetingUploading] = useState(false);
  const [meetingForm, setMeetingForm] = useState<{ imageUrl: string }>({ imageUrl: '' });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.cms(),
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      return fetchCms(token);
    },
    enabled: !!user,
  });

  const patchMutation = useMutation({
    mutationFn: async (payload: CmsPatchPayload) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      await patchCms(token, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.cms() });
      toast.success('저장되었습니다.');
      setAddingBanner(false);
      setPopupForm({});
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : '저장 실패'),
  });

  const banners = data?.heroBanners ?? [];
  const storeHeroImage = data?.storeHeroImage ?? null;
  const mainBottomLeft = data?.mainBottomLeft ?? null;
  const mainBottomRight = data?.mainBottomRight ?? null;
  const popup = data?.popup ?? null;
  const popups = (data?.popups?.length ? data.popups : (popup ? [popup] : [])).slice().sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
  const newBannerCropPreset = getBannerCropPreset(newBanner.position);
  const newBannerExpectedSize = POSITION_OPTIONS.find((p) => p.value === (newBanner.position ?? 'main_hero'))?.size ?? '1200×400px';
  const newBannerTargetRatio =
    newBannerCropPreset.outputWidth && newBannerCropPreset.outputHeight
      ? newBannerCropPreset.outputWidth / newBannerCropPreset.outputHeight
      : newBannerCropPreset.cropAspectRatio;
  const newBannerActualRatio = newBannerImageDimensions ? newBannerImageDimensions.width / newBannerImageDimensions.height : null;
  const newBannerRatioGap =
    newBannerActualRatio && Number.isFinite(newBannerActualRatio)
      ? Math.abs(newBannerActualRatio - newBannerTargetRatio) / newBannerTargetRatio
      : null;
  const showBannerRatioWarning = newBannerRatioGap !== null && newBannerRatioGap > 0.18;

  useEffect(() => {
    if (storeHeroImage) setStoreHeroForm({ imageUrl: storeHeroImage.imageUrl, linkUrl: storeHeroImage.linkUrl || '/' });
    else setStoreHeroForm((prev) => (prev.imageUrl ? prev : { imageUrl: '', linkUrl: '/' }));
  }, [storeHeroImage]);
  useEffect(() => {
    if (mainBottomLeft) setMainBottomLeftForm({ imageUrl: mainBottomLeft.imageUrl, linkUrl: mainBottomLeft.linkUrl || '/' });
    else setMainBottomLeftForm((prev) => (prev.imageUrl ? prev : { imageUrl: '', linkUrl: '/' }));
  }, [mainBottomLeft]);
  useEffect(() => {
    if (mainBottomRight) setMainBottomRightForm({ imageUrl: mainBottomRight.imageUrl, linkUrl: mainBottomRight.linkUrl || '/' });
    else setMainBottomRightForm((prev) => (prev.imageUrl ? prev : { imageUrl: '', linkUrl: '/' }));
  }, [mainBottomRight]);
  const aboutBookstoreImage = (data as { aboutBookstoreImage?: StoreHeroImage | null })?.aboutBookstoreImage ?? null;
  useEffect(() => {
    if (aboutBookstoreImage) setAboutBookstoreForm({ imageUrl: aboutBookstoreImage.imageUrl, linkUrl: aboutBookstoreImage.linkUrl || '/bulk-order' });
    else setAboutBookstoreForm((prev) => (prev.imageUrl ? prev : { imageUrl: '', linkUrl: '/bulk-order' }));
  }, [aboutBookstoreImage?.imageUrl]);
  const meetingAtBookstoreImage = (data as { meetingAtBookstoreImage?: { imageUrl: string } | null })?.meetingAtBookstoreImage ?? null;
  useEffect(() => {
    if (meetingAtBookstoreImage) setMeetingForm({ imageUrl: meetingAtBookstoreImage.imageUrl });
    else setMeetingForm((prev) => (prev.imageUrl ? prev : { imageUrl: '' }));
  }, [meetingAtBookstoreImage?.imageUrl]);

  const handleSaveStoreHero = () => {
    if (storeHeroUploading) {
      toast.error('이미지 업로드가 진행 중입니다.');
      return;
    }
    if (!storeHeroForm.imageUrl?.trim()) {
      toast.error('서점 이미지를 업로드해 주세요.');
      return;
    }
    patchMutation.mutate({
      storeHeroImage: {
        imageUrl: storeHeroForm.imageUrl.trim(),
        linkUrl: storeHeroForm.linkUrl?.trim() || '/',
      },
    });
  };

  const handleDeleteStoreHero = () => {
    if (storeHeroUploading) {
      toast.error('이미지 업로드가 진행 중입니다.');
      return;
    }
    patchMutation.mutate({ storeHeroImage: null });
  };

  const handleSaveMainBottomLeft = () => {
    if (mainBottomLeftUploading) {
      toast.error('이미지 업로드가 진행 중입니다.');
      return;
    }
    if (!mainBottomLeftForm.imageUrl?.trim()) {
      toast.error('이미지를 업로드해 주세요.');
      return;
    }
    patchMutation.mutate({
      mainBottomLeft: {
        imageUrl: mainBottomLeftForm.imageUrl.trim(),
        linkUrl: mainBottomLeftForm.linkUrl?.trim() || '/',
      },
    });
  };
  const handleSaveMainBottomRight = () => {
    if (mainBottomRightUploading) {
      toast.error('이미지 업로드가 진행 중입니다.');
      return;
    }
    if (!mainBottomRightForm.imageUrl?.trim()) {
      toast.error('이미지를 업로드해 주세요.');
      return;
    }
    patchMutation.mutate({
      mainBottomRight: {
        imageUrl: mainBottomRightForm.imageUrl.trim(),
        linkUrl: mainBottomRightForm.linkUrl?.trim() || '/',
      },
    });
  };

  const handleSaveAboutBookstore = () => {
    if (aboutBookstoreUploading) { toast.error('이미지 업로드가 진행 중입니다.'); return; }
    if (!aboutBookstoreForm.imageUrl?.trim()) { toast.error('이미지를 업로드해 주세요.'); return; }
    patchMutation.mutate({ aboutBookstoreImage: { imageUrl: aboutBookstoreForm.imageUrl.trim(), linkUrl: aboutBookstoreForm.linkUrl?.trim() || '/bulk-order' } });
  };
  const handleDeleteAboutBookstore = () => {
    patchMutation.mutate({ aboutBookstoreImage: null });
  };

  const handleSaveMeeting = () => {
    if (meetingUploading) { toast.error('이미지 업로드가 진행 중입니다.'); return; }
    if (!meetingForm.imageUrl?.trim()) { toast.error('이미지를 업로드해 주세요.'); return; }
    patchMutation.mutate({ meetingAtBookstoreImage: { imageUrl: meetingForm.imageUrl.trim() } });
  };
  const handleDeleteMeeting = () => {
    patchMutation.mutate({ meetingAtBookstoreImage: null });
  };

  const handleAddBanner = () => {
    if (bannerUploading) {
      toast.error('배너 이미지 업로드가 아직 끝나지 않았습니다.');
      return;
    }
    if (!newBanner.imageUrl || !newBanner.linkUrl || newBanner.position === undefined) {
      toast.error('이미지와 링크, 위치를 입력해 주세요.');
      return;
    }
    const nextOrder = banners.length;
    const banner: Banner = {
      id: newBanner.id ?? `banner_${Date.now()}`,
      imageUrl: newBanner.imageUrl,
      linkUrl: newBanner.linkUrl,
      position: newBanner.position as string,
      isActive: newBanner.isActive ?? true,
      startDate: newBanner.startDate ?? new Date().toISOString().slice(0, 10),
      endDate: newBanner.endDate ?? null,
      order: newBanner.order ?? nextOrder,
    };
    patchMutation.mutate({ heroBanners: [...banners, banner] });
    setNewBanner({ linkUrl: '/', position: 'main_hero', isActive: true, order: banners.length + 1 });
  };

  const handleDeleteBanner = (id: string) => {
    patchMutation.mutate({ heroBanners: banners.filter((b) => b.id !== id) });
  };

  const isEditingPopup = !!popupForm.id;

  const handleEditPopup = (item: PopupData) => {
    const si = item.slotIndex ?? 0;
    setPopupForm({
      id: item.id,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl ?? '/',
      isActive: item.isActive ?? true,
      priority: 9999,
      endDate: item.endDate ?? null,
      slotIndex: si,
      dock: normalizePopupDock(item.dock, si),
      widthPx: item.widthPx ?? 600,
      heightPx: item.heightPx ?? 400,
    });
  };

  const handleSavePopup = () => {
    if (popupUploading) {
      toast.error('팝업 이미지 업로드가 아직 끝나지 않았습니다.');
      return;
    }
    if (!popupForm.imageUrl) {
      toast.error('팝업 이미지를 업로드해 주세요.');
      return;
    }
    const slotIndex = isEditingPopup ? (popupForm.slotIndex ?? 0) : popups.length;
    const { widthPx, heightPx } = clampStoredPopupDimensions(popupForm.widthPx, popupForm.heightPx);
    const dock = normalizePopupDock(popupForm.dock, slotIndex);
    const nextPopup: PopupData = {
      id: popupForm.id ?? `popup_${Date.now()}`,
      imageUrl: popupForm.imageUrl,
      linkUrl: popupForm.linkUrl?.trim() || '/',
      isActive: popupForm.isActive ?? true,
      priority: 9999,
      endDate: popupForm.endDate || null,
      slotIndex,
      dock,
      widthPx,
      heightPx,
    };
    const nextPopups = isEditingPopup
      ? popups.map((item) => (item.id === nextPopup.id ? nextPopup : item))
      : [...popups, nextPopup];
    patchMutation.mutate({ popups: nextPopups });
  };

  const handleDeletePopup = (id?: string) => {
    const remaining = popups.filter((item) => item.id !== id);
    // 삭제 후 슬롯을 0,1,2... 로 재정렬 (왼쪽→가운데→오른쪽→다음 줄 순 유지)
    const reindexed = remaining
      .slice()
      .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0))
      .map((item, index) => ({ ...item, slotIndex: index }));
    patchMutation.mutate({ popups: reindexed });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="데이터를 불러올 수 없습니다"
        message={error instanceof Error ? error.message : '오류가 발생했습니다.'}
      />
    );
  }

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">배너 / 팝업</h1>

      {Boolean(data?.firestoreDegraded) && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Firestore에서 설정을 불러오지 못했습니다. (일일 읽기 한도 초과 등) 한도가 회복되면 새로고침해 주세요.
          저장은 한도가 남아 있을 때만 가능합니다.
        </div>
      )}

      {/* 서점 이미지 — 탭 위 대문 영역 (항상 영역 확보, ~1200px) */}
      <StoreHeroSection
        storeHeroForm={storeHeroForm}
        setStoreHeroForm={setStoreHeroForm}
        storeHeroUploading={storeHeroUploading}
        setStoreHeroUploading={setStoreHeroUploading}
        isPending={patchMutation.isPending}
        onSaveStoreHero={handleSaveStoreHero}
        onDeleteStoreHero={handleDeleteStoreHero}
      />

      {/* 메인 하단 배너 — MD의 선택 섹션 하단 2열 (고정 슬롯) */}
      <MainBottomBannersSection
        mainBottomLeftForm={mainBottomLeftForm}
        setMainBottomLeftForm={setMainBottomLeftForm}
        mainBottomRightForm={mainBottomRightForm}
        setMainBottomRightForm={setMainBottomRightForm}
        mainBottomLeftUploading={mainBottomLeftUploading}
        setMainBottomLeftUploading={setMainBottomLeftUploading}
        mainBottomRightUploading={mainBottomRightUploading}
        setMainBottomRightUploading={setMainBottomRightUploading}
        isPending={patchMutation.isPending}
        onSaveMainBottomLeft={handleSaveMainBottomLeft}
        onSaveMainBottomRight={handleSaveMainBottomRight}
      />

      <HomeBackgroundImagesSection
        aboutBookstoreImage={aboutBookstoreImage}
        aboutBookstoreForm={aboutBookstoreForm}
        setAboutBookstoreForm={setAboutBookstoreForm}
        aboutBookstoreUploading={aboutBookstoreUploading}
        setAboutBookstoreUploading={setAboutBookstoreUploading}
        meetingAtBookstoreImage={meetingAtBookstoreImage}
        meetingForm={meetingForm}
        setMeetingForm={setMeetingForm}
        meetingUploading={meetingUploading}
        setMeetingUploading={setMeetingUploading}
        isPending={patchMutation.isPending}
        onSaveAboutBookstore={handleSaveAboutBookstore}
        onDeleteAboutBookstore={handleDeleteAboutBookstore}
        onSaveMeeting={handleSaveMeeting}
        onDeleteMeeting={handleDeleteMeeting}
      />

      {/* 배너 목록 — 메인 히어로 배너가 스토어 홈 상단 캐러셀(7:3 그리드 좌측 7)에 노출됩니다 */}
      <BannerManagerSection
        banners={banners}
        addingBanner={addingBanner}
        setAddingBanner={setAddingBanner}
        bannerUploading={bannerUploading}
        setBannerUploading={setBannerUploading}
        newBannerImageDimensions={newBannerImageDimensions}
        setNewBannerImageDimensions={setNewBannerImageDimensions}
        newBanner={newBanner}
        setNewBanner={setNewBanner}
        newBannerCropPreset={newBannerCropPreset}
        newBannerExpectedSize={newBannerExpectedSize}
        newBannerTargetRatio={newBannerTargetRatio}
        newBannerActualRatio={newBannerActualRatio}
        showBannerRatioWarning={showBannerRatioWarning}
        isPending={patchMutation.isPending}
        onAddBanner={handleAddBanner}
        onDeleteBanner={handleDeleteBanner}
      />

      {/* 팝업 관리 */}
      <PopupManagerSection
        popups={popups}
        popupForm={popupForm}
        setPopupForm={setPopupForm}
        popupUploading={popupUploading}
        setPopupUploading={setPopupUploading}
        isEditingPopup={isEditingPopup}
        isPending={patchMutation.isPending}
        onEditPopup={handleEditPopup}
        onDeletePopup={handleDeletePopup}
        onSavePopup={handleSavePopup}
      />
    </main>
  );
}

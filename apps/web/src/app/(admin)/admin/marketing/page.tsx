'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminPreviewImage from '@/components/admin/AdminPreviewImage';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';
import { queryKeys } from '@/lib/queryKeys';
import ImagePreviewUploader from '@/components/admin/ImagePreviewUploader';
import InternalLinkPicker from '@/components/admin/InternalLinkPicker';
import { toast } from 'sonner';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { clampStoredPopupDimensions } from '@/lib/popup-dimensions';
import { normalizePopupDock, POPUP_DOCK_LABEL, type PopupDock } from '@/lib/popup-dock';

const POSITION_OPTIONS = [
  { value: 'main_hero', label: '메인 히어로', size: '1200×400px' },
  { value: 'main_top', label: '메인 상단', size: '1200×300px' },
  { value: 'sidebar', label: '사이드바', size: '300×400px' },
] as const;

const POPUP_PX_INPUT_MAX = 8000;

type CropPreset = {
  cropAspectRatio: number;
  previewAspectRatio?: number;
  cropTitle: string;
  cropDescription: string;
  outputWidth?: number;
  outputHeight?: number;
};

type BannerImageDimensions = {
  width: number;
  height: number;
};

const MARKETING_IMAGE_PRESETS = {
  storeHero: {
    cropAspectRatio: 10 / 3,
    previewAspectRatio: 10 / 3,
    cropTitle: '메인 상단 대문 이미지 자르기',
    cropDescription: '헤더 아래에 노출되는 넓은 배너 비율로 잘라서 업로드합니다.',
    outputWidth: 1600,
    outputHeight: 480,
  },
  mainBottomBanner: {
    cropAspectRatio: 3 / 1,
    previewAspectRatio: 3 / 1,
    cropTitle: '메인 하단 배너 자르기',
    cropDescription: 'MD의 선택 하단 배너 비율에 맞게 잘라서 업로드합니다.',
    outputWidth: 600,
    outputHeight: 200,
  },
  aboutBookstore: {
    cropAspectRatio: 5 / 3,
    previewAspectRatio: 5 / 3,
    cropTitle: '서점 소개 배경 이미지 자르기',
    cropDescription: '서점 소개 영역 배경에 맞는 가로형 비율로 잘라서 업로드합니다.',
    outputWidth: 1000,
    outputHeight: 600,
  },
  meetingAtBookstore: {
    cropAspectRatio: 16 / 9,
    previewAspectRatio: 16 / 9,
    cropTitle: '서점에서의 만남 배경 이미지 자르기',
    cropDescription: '이벤트 카드 배경에 맞게 16:9 비율로 잘라서 업로드합니다.',
    outputWidth: 800,
    outputHeight: 450,
  },
  popup: {
    cropAspectRatio: 3 / 4,
    previewAspectRatio: 3 / 4,
    cropTitle: '팝업 이미지 자르기',
    cropDescription: '팝업 노출 비율에 맞게 세로형으로 잘라서 업로드합니다.',
    outputWidth: 600,
    outputHeight: 800,
  },
} satisfies Record<string, CropPreset>;

const HERO_BANNER_CROP_PRESETS = {
  main_hero: {
    cropAspectRatio: 10 / 4,
    previewAspectRatio: 10 / 4,
    cropTitle: '메인 히어로 배너 자르기',
    cropDescription: '메인 캐러셀에 맞는 넓은 배너 비율로 잘라서 업로드합니다.',
    outputWidth: 1200,
    outputHeight: 480,
  },
  main_top: {
    cropAspectRatio: 4 / 1,
    previewAspectRatio: 4 / 1,
    cropTitle: '메인 상단 배너 자르기',
    cropDescription: '상단 띠 배너 비율에 맞게 잘라서 업로드합니다.',
    outputWidth: 1200,
    outputHeight: 300,
  },
  sidebar: {
    cropAspectRatio: 3 / 4,
    previewAspectRatio: 3 / 4,
    cropTitle: '사이드 배너 자르기',
    cropDescription: '세로형 사이드 배너 비율에 맞게 잘라서 업로드합니다.',
    outputWidth: 300,
    outputHeight: 400,
  },
} satisfies Record<(typeof POSITION_OPTIONS)[number]['value'], CropPreset>;

function getBannerCropPreset(position?: string): CropPreset {
  if (position === 'main_top') return HERO_BANNER_CROP_PRESETS.main_top;
  if (position === 'sidebar') return HERO_BANNER_CROP_PRESETS.sidebar;
  return HERO_BANNER_CROP_PRESETS.main_hero;
}

function getBannerPreviewLabel(position?: string): string {
  if (position === 'main_top') return '상단 띠 배너';
  if (position === 'sidebar') return '사이드 배너';
  return '메인 히어로';
}

function getBannerRatioLabel(aspectRatio: number): string {
  const rounded = aspectRatio >= 1 ? aspectRatio.toFixed(2).replace(/\.00$/, '') : aspectRatio.toFixed(3);
  return `${rounded}:1`;
}

function getBannerRatioGuidance(position?: string): string {
  if (position === 'main_top') return '가로가 지나치게 긴 파노라마형 이미지는 상하 여백이 커질 수 있습니다.';
  if (position === 'sidebar') return '세로형 배너라서 상단과 하단보다 중앙 영역에 핵심 요소를 두는 편이 안정적입니다.';
  return '메인 상단 캐러셀은 원본을 그대로 보여주기 때문에 너무 긴 이미지는 화면에서 작아 보일 수 있습니다.';
}

function getPopupSlotLabel(slotIndex: number): string {
  const row = Math.floor(slotIndex / 3) + 1;
  const col = slotIndex % 3;
  const colLabel = col === 0 ? '왼쪽' : col === 1 ? '가운데' : '오른쪽';
  return `${row}번째 줄 ${colLabel}`;
}

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  order: number;
}

interface PopupData {
  id?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  priority?: number;
  endDate?: string | null;
  slotIndex?: number;
  /** 스토어 가로 배치: left | center | right */
  dock?: PopupDock;
  widthPx?: number;
  heightPx?: number;
}

interface StoreHeroImage {
  imageUrl: string;
  linkUrl: string;
}

interface CmsHome {
  heroBanners: Banner[];
  storeHeroImage: StoreHeroImage | null;
  mainBottomLeft: StoreHeroImage | null;
  mainBottomRight: StoreHeroImage | null;
  popup: PopupData | null;
  popups: PopupData[];
  [key: string]: unknown;
}

async function fetchCms(token: string): Promise<CmsHome> {
  const res = await fetch('/api/admin/cms', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

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
    mutationFn: async (payload: { heroBanners?: Banner[]; storeHeroImage?: StoreHeroImage | null; mainBottomLeft?: StoreHeroImage | null; mainBottomRight?: StoreHeroImage | null; aboutBookstoreImage?: StoreHeroImage | null; meetingAtBookstoreImage?: { imageUrl: string } | null; popup?: PopupData; popups?: PopupData[] }) => {
      if (!user) throw new Error('Not authenticated');
      const token = await getAdminToken(user);
      const res = await fetch('/api/admin/cms', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
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
              <Button onClick={handleSaveStoreHero} disabled={patchMutation.isPending || storeHeroUploading || !storeHeroForm.imageUrl?.trim()}>
                {storeHeroUploading ? '업로드 중…' : '서점 이미지 저장'}
              </Button>
              {storeHeroForm.imageUrl?.trim() && (
                <Button variant="destructive" onClick={handleDeleteStoreHero} disabled={patchMutation.isPending || storeHeroUploading}>
                  삭제
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 메인 하단 배너 — MD의 선택 섹션 하단 2열 (고정 슬롯) */}
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
            <Button onClick={handleSaveMainBottomLeft} disabled={patchMutation.isPending || mainBottomLeftUploading || !mainBottomLeftForm.imageUrl?.trim()}>
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
            <Button onClick={handleSaveMainBottomRight} disabled={patchMutation.isPending || mainBottomRightUploading || !mainBottomRightForm.imageUrl?.trim()}>
              {mainBottomRightUploading ? '업로드 중…' : '우측 저장'}
            </Button>
          </div>
        </div>
      </section>

      {/* 대량구매 띠배너 배경 이미지 */}
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
              <Button onClick={handleSaveAboutBookstore} disabled={patchMutation.isPending || aboutBookstoreUploading || !aboutBookstoreForm.imageUrl?.trim()}>
                {aboutBookstoreUploading ? '업로드 중…' : '저장'}
              </Button>
              {aboutBookstoreImage?.imageUrl && (
                <Button variant="outline" onClick={handleDeleteAboutBookstore} disabled={patchMutation.isPending}>삭제</Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 서점에서의 만남 이벤트 카드 배경 이미지 */}
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
              <Button onClick={handleSaveMeeting} disabled={patchMutation.isPending || meetingUploading || !meetingForm.imageUrl?.trim()}>
                {meetingUploading ? '업로드 중…' : '저장'}
              </Button>
              {meetingAtBookstoreImage?.imageUrl && (
                <Button variant="outline" onClick={handleDeleteMeeting} disabled={patchMutation.isPending}>삭제</Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 배너 목록 — 메인 히어로 배너가 스토어 홈 상단 캐러셀(7:3 그리드 좌측 7)에 노출됩니다 */}
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
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteBanner(b.id)}
                  disabled={patchMutation.isPending}
                >
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
              <Button onClick={handleAddBanner} disabled={patchMutation.isPending || !newBanner.imageUrl || bannerUploading}>
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

      {/* 팝업 관리 */}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPopup(item)}
                  disabled={patchMutation.isPending}
                >
                  수정
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeletePopup(item.id)}
                  disabled={patchMutation.isPending}
                >
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
              {[
                { label: '홈', value: '/' },
                { label: '도서', value: '/books' },
                { label: '북콘서트', value: '/concerts' },
                { label: '이벤트', value: '/events' },
                { label: '콘텐츠', value: '/content' },
              ].map((opt) => (
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
            <Button onClick={handleSavePopup} disabled={patchMutation.isPending || popupUploading} className="min-h-[48px]">
              {popupUploading ? '업로드 중…' : isEditingPopup ? '팝업 수정 저장' : '팝업 추가'}
            </Button>
            <Button variant="outline" onClick={() => setPopupForm({})} disabled={patchMutation.isPending} className="min-h-[48px]">
              {isEditingPopup ? '수정 취소' : '입력 초기화'}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

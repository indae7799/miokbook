import type { PopupDock } from '@/lib/popup-dock';

export type CropPreset = {
  cropAspectRatio: number;
  previewAspectRatio?: number;
  cropTitle: string;
  cropDescription: string;
  outputWidth?: number;
  outputHeight?: number;
};

export type BannerImageDimensions = {
  width: number;
  height: number;
};

export interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  order: number;
}

export interface PopupData {
  id?: string;
  imageUrl?: string;
  linkUrl?: string;
  isActive?: boolean;
  priority?: number;
  endDate?: string | null;
  slotIndex?: number;
  dock?: PopupDock;
  widthPx?: number;
  heightPx?: number;
}

export interface StoreHeroImage {
  imageUrl: string;
  linkUrl: string;
}

export interface CmsHome {
  heroBanners: Banner[];
  storeHeroImage: StoreHeroImage | null;
  mainBottomLeft: StoreHeroImage | null;
  mainBottomRight: StoreHeroImage | null;
  popup: PopupData | null;
  popups: PopupData[];
  [key: string]: unknown;
}

export interface CmsPatchPayload {
  heroBanners?: Banner[];
  storeHeroImage?: StoreHeroImage | null;
  mainBottomLeft?: StoreHeroImage | null;
  mainBottomRight?: StoreHeroImage | null;
  aboutBookstoreImage?: StoreHeroImage | null;
  meetingAtBookstoreImage?: { imageUrl: string } | null;
  popup?: PopupData;
  popups?: PopupData[];
}

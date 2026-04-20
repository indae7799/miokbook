import type { CropPreset } from './marketing.types';

export const POSITION_OPTIONS = [
  { value: 'main_hero', label: '메인 히어로', size: '1200×400px' },
  { value: 'main_top', label: '메인 상단', size: '1200×300px' },
  { value: 'sidebar', label: '사이드바', size: '300×400px' },
] as const;

export const POPUP_PX_INPUT_MAX = 8000;

export const MARKETING_IMAGE_PRESETS = {
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

export function getBannerCropPreset(position?: string): CropPreset {
  if (position === 'main_top') return HERO_BANNER_CROP_PRESETS.main_top;
  if (position === 'sidebar') return HERO_BANNER_CROP_PRESETS.sidebar;
  return HERO_BANNER_CROP_PRESETS.main_hero;
}

export function getBannerPreviewLabel(position?: string): string {
  if (position === 'main_top') return '상단 띠 배너';
  if (position === 'sidebar') return '사이드 배너';
  return '메인 히어로';
}

export function getBannerRatioLabel(aspectRatio: number): string {
  const rounded = aspectRatio >= 1 ? aspectRatio.toFixed(2).replace(/\.00$/, '') : aspectRatio.toFixed(3);
  return `${rounded}:1`;
}

export function getBannerRatioGuidance(position?: string): string {
  if (position === 'main_top') return '가로가 지나치게 긴 파노라마형 이미지는 상하 여백이 커질 수 있습니다.';
  if (position === 'sidebar') return '세로형 배너라서 상단과 하단보다 중앙 영역에 핵심 요소를 두는 편이 안정적입니다.';
  return '메인 상단 캐러셀은 영역을 우선 꽉 채우고, 비율 차이가 큰 원본은 배경까지 채운 상태로 원본 전체가 최대한 보이도록 노출합니다.';
}

export function getPopupSlotLabel(slotIndex: number): string {
  const row = Math.floor(slotIndex / 3) + 1;
  const col = slotIndex % 3;
  const colLabel = col === 0 ? '왼쪽' : col === 1 ? '가운데' : '오른쪽';
  return `${row}번째 줄 ${colLabel}`;
}

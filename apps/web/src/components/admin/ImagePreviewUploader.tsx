'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function resolveImageContentType(file: File): string | null {
  const name = (file.name || '').toLowerCase();
  const fromName =
    /\.(jpe?g)$/.test(name)
      ? 'image/jpeg'
      : name.endsWith('.png')
        ? 'image/png'
        : name.endsWith('.webp')
          ? 'image/webp'
          : null;
  if (ALLOWED_TYPES.includes(file.type)) return file.type;
  if (fromName) return fromName;
  return null;
}

function toUploadableFile(file: File): File {
  const ct = resolveImageContentType(file);
  if (!ct || file.type === ct) return file;
  return new File([file], file.name, { type: ct, lastModified: file.lastModified });
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지 크기를 읽을 수 없습니다.'));
    };
    img.src = url;
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };
    img.src = url;
  });
}

async function createCroppedFile(
  file: File,
  aspectRatio: number,
  zoom: number,
  cropX: number,
  cropY: number,
  outputWidth?: number,
  outputHeight?: number,
): Promise<File> {
  const image = await loadImage(file);
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
  const safeZoom = Math.min(3, Math.max(0.1, zoom));

  const baseCropWidth = Math.min(image.naturalWidth, image.naturalHeight * safeAspect);
  const baseCropHeight = baseCropWidth / safeAspect;
  const safeOutputWidth = Number.isFinite(outputWidth) && (outputWidth as number) > 0 ? Math.round(outputWidth as number) : Math.round(baseCropWidth);
  const safeOutputHeight = Number.isFinite(outputHeight) && (outputHeight as number) > 0 ? Math.round(outputHeight as number) : Math.round(baseCropHeight);

  const canvas = document.createElement('canvas');
  canvas.width = safeOutputWidth;
  canvas.height = safeOutputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지 편집을 시작할 수 없습니다.');

  if (safeZoom >= 1) {
    // 확대: 이미지의 일부를 잘라서 출력
    const cropWidth = Math.max(1, Math.round(baseCropWidth / safeZoom));
    const cropHeight = Math.max(1, Math.round(baseCropHeight / safeZoom));
    const maxLeft = Math.max(0, image.naturalWidth - cropWidth);
    const maxTop = Math.max(0, image.naturalHeight - cropHeight);
    const sourceX = Math.round((Math.min(100, Math.max(0, cropX)) / 100) * maxLeft);
    const sourceY = Math.round((Math.min(100, Math.max(0, cropY)) / 100) * maxTop);
    context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, safeOutputWidth, safeOutputHeight);
  } else {
    // 축소: 이미지 전체를 프레임 안에 letterbox로 배치 (흰 배경)
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, safeOutputWidth, safeOutputHeight);
    const scale = safeZoom;
    const scaledW = Math.round(safeOutputWidth * scale);
    const scaledH = Math.round(safeOutputHeight * scale);
    const destX = Math.round((safeOutputWidth - scaledW) / 2);
    const destY = Math.round((safeOutputHeight - scaledH) / 2);
    context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, destX, destY, scaledW, scaledH);
  }

  const outputType = resolveImageContentType(file) ?? 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('잘린 이미지를 만들지 못했습니다.'));
    }, outputType, outputType === 'image/jpeg' ? 0.92 : undefined);
  });

  return new File([blob], file.name, { type: outputType, lastModified: Date.now() });
}

export interface ImagePreviewUploaderProps {
  storagePath: string;
  onUploadComplete: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onImageDimensions?: (width: number, height: number) => void;
  enableCrop?: boolean;
  cropAspectRatio?: number;
  previewAspectRatio?: number;
  cropTitle?: string;
  cropDescription?: string;
  outputWidth?: number;
  outputHeight?: number;
}

const HORIZONTAL_FOCUS_PRESETS = [
  { label: '좌측', value: 20 },
  { label: '중앙', value: 50 },
  { label: '우측', value: 80 },
] as const;

const VERTICAL_FOCUS_PRESETS = [
  { label: '상단', value: 20 },
  { label: '중앙', value: 50 },
  { label: '하단', value: 80 },
] as const;

export default function ImagePreviewUploader({
  storagePath,
  onUploadComplete,
  onUploadingChange,
  onImageDimensions,
  enableCrop = false,
  cropAspectRatio = 16 / 9,
  previewAspectRatio,
  cropTitle = '이미지 자르기',
  cropDescription = '미리보기 이미지를 직접 드래그해 위치를 맞춘 뒤 업로드하세요.',
  outputWidth,
  outputHeight,
}: ImagePreviewUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStateRef = useRef<{ startX: number; startY: number; startCropX: number; startCropY: number } | null>(null);
  const user = useAuthStore((s) => s.user);
  const effectivePreviewAspectRatio =
    Number.isFinite(previewAspectRatio) && (previewAspectRatio as number) > 0
      ? (previewAspectRatio as number)
      : cropAspectRatio;

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const replacePreview = (nextUrl: string | null) => {
    setPreviewUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return nextUrl;
    });
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    onUploadingChange?.(true);
    try {
      if (!user) throw new Error('로그인이 필요합니다.');
      if (onImageDimensions) {
        try {
          const { width, height } = await readImageDimensions(file);
          if (width > 0 && height > 0) onImageDimensions(width, height);
        } catch {
          // Dimension read failure should not block upload.
        }
      }
      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('storagePath', storagePath);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err?.error === 'string' ? err.error : '업로드에 실패했습니다.';
        const detail = typeof err?.detail === 'string' ? err.detail : '';
        const hint = typeof err?.hint === 'string' ? err.hint : '';
        const parts = [msg, detail, hint].filter(Boolean);
        throw new Error(parts.join(' / '));
      }

      const { url } = await res.json();
      onUploadComplete(url);
      setPendingFile(null);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const resolvedType = resolveImageContentType(file);
    if (!resolvedType) {
      setError('JPEG, PNG, WEBP만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    const fileToSend = toUploadableFile(file);
    replacePreview(URL.createObjectURL(fileToSend));

    if (enableCrop) {
      setPendingFile(fileToSend);
      setCropZoom(1);
      setCropX(50);
      setCropY(50);
      return;
    }

    try {
      await uploadFile(fileToSend);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    }
  };

  const handleCropUpload = async () => {
    if (!pendingFile) return;
    setError(null);
    try {
      const croppedFile = await createCroppedFile(
        pendingFile,
        cropAspectRatio,
        cropZoom,
        cropX,
        cropY,
        outputWidth,
        outputHeight,
      );
      replacePreview(URL.createObjectURL(croppedFile));
      await uploadFile(croppedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '잘린 이미지 업로드에 실패했습니다.');
    }
  };

  const handleCropReset = () => {
    setCropZoom(1);
    setCropX(50);
    setCropY(50);
  };

  const handleHorizontalFocus = (value: number) => {
    setCropX(value);
  };

  const handleVerticalFocus = (value: number) => {
    setCropY(value);
  };

  const handleCropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!enableCrop || !pendingFile) return;
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startCropX: cropX,
      startCropY: cropY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    setCropX(Math.min(100, Math.max(0, drag.startCropX - deltaX * 0.18)));
    setCropY(Math.min(100, Math.max(0, drag.startCropY - deltaY * 0.18)));
  };

  const handleCropPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
        disabled={uploading}
        className="block min-h-[48px] text-sm file:min-h-[48px]"
      />
      {previewUrl ? (
        <div
          className="relative w-full max-w-[320px] overflow-hidden rounded border border-border bg-muted"
          style={{ aspectRatio: `${effectivePreviewAspectRatio}` }}
          onPointerDown={handleCropPointerDown}
          onPointerMove={handleCropPointerMove}
          onPointerUp={handleCropPointerUp}
          onPointerCancel={handleCropPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="미리보기"
            className={enableCrop && pendingFile ? 'h-full w-full cursor-grab select-none object-cover active:cursor-grabbing' : 'h-full w-full object-cover'}
            draggable={false}
            style={enableCrop && pendingFile ? { objectPosition: `${cropX}% ${cropY}%`, transform: `scale(${cropZoom})`, transformOrigin: 'center center' } : undefined}
          />
        </div>
      ) : null}
      {enableCrop && pendingFile ? (
        <div className="space-y-3 rounded border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium text-foreground">{cropTitle}</p>
          <p className="text-xs text-muted-foreground">{cropDescription}</p>
          <label className="block text-xs text-muted-foreground">
            축소 / 확대
            <div className="mt-1 flex items-center gap-2">
              <span className="shrink-0 text-[10px]">축소</span>
              <input
                type="range"
                min="0.3"
                max="3"
                step="0.05"
                value={cropZoom}
                onChange={(event) => setCropZoom(Number(event.target.value))}
                className="w-full"
              />
              <span className="shrink-0 text-[10px]">확대</span>
            </div>
            <div className="mt-1 text-right text-[10px] tabular-nums text-muted-foreground">
              {cropZoom < 1 ? `${Math.round(cropZoom * 100)}%` : `${cropZoom.toFixed(1)}×`}
            </div>
          </label>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">초점 빠르게 맞추기</p>
            <div className="flex flex-wrap gap-2">
              {HORIZONTAL_FOCUS_PRESETS.map((preset) => (
                <button
                  key={`horizontal-${preset.label}`}
                  type="button"
                  onClick={() => handleHorizontalFocus(preset.value)}
                  disabled={uploading}
                  className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
                    Math.abs(cropX - preset.value) < 1
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {VERTICAL_FOCUS_PRESETS.map((preset) => (
                <button
                  key={`vertical-${preset.label}`}
                  type="button"
                  onClick={() => handleVerticalFocus(preset.value)}
                  disabled={uploading}
                  className={`inline-flex min-h-[36px] items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors disabled:opacity-60 ${
                    Math.abs(cropY - preset.value) < 1
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="rounded-md border border-border/70 bg-background px-3 py-2">가로 초점: {Math.round(cropX)}%</div>
            <div className="rounded-md border border-border/70 bg-background px-3 py-2">세로 초점: {Math.round(cropY)}%</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCropReset}
              disabled={uploading}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              위치 초기화
            </button>
            <button
              type="button"
              onClick={handleCropUpload}
              disabled={uploading}
              className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {uploading ? '업로드 중...' : '자르고 업로드'}
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {uploading ? <p className="text-sm text-muted-foreground">업로드 중...</p> : null}
    </div>
  );
}

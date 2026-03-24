'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function resolveImageContentType(file: File): string | null {
  const name = (file.name || '').toLowerCase();
  const fromName =
    /\.(jpe?g)$/.test(name) ? 'image/jpeg' : name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : null;
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
): Promise<File> {
  const image = await loadImage(file);
  const safeAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 16 / 9;
  const safeZoom = Math.min(3, Math.max(1, zoom));
  const baseCropWidth = Math.min(image.naturalWidth, image.naturalHeight * safeAspect);
  const baseCropHeight = baseCropWidth / safeAspect;
  const cropWidth = Math.max(1, Math.round(baseCropWidth / safeZoom));
  const cropHeight = Math.max(1, Math.round(baseCropHeight / safeZoom));
  const maxLeft = Math.max(0, image.naturalWidth - cropWidth);
  const maxTop = Math.max(0, image.naturalHeight - cropHeight);
  const sourceX = Math.round((Math.min(100, Math.max(0, cropX)) / 100) * maxLeft);
  const sourceY = Math.round((Math.min(100, Math.max(0, cropY)) / 100) * maxTop);

  const canvas = document.createElement('canvas');
  canvas.width = cropWidth;
  canvas.height = cropHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('이미지 편집을 시작할 수 없습니다.');

  context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const outputType = resolveImageContentType(file) ?? 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('크롭 이미지를 만들지 못했습니다.'));
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
}

export default function ImagePreviewUploader({
  storagePath,
  onUploadComplete,
  onUploadingChange,
  onImageDimensions,
  enableCrop = false,
  cropAspectRatio = 16 / 9,
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
        const msg = typeof err?.error === 'string' ? err.error : '업로드 실패';
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

    if (onImageDimensions) {
      try {
        const { width, height } = await readImageDimensions(fileToSend);
        if (width > 0 && height > 0) onImageDimensions(width, height);
      } catch {
        // Dimension read failure should not block upload.
      }
    }

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
      setError(err instanceof Error ? err.message : '업로드 실패');
    }
  };

  const handleCropUpload = async () => {
    if (!pendingFile) return;
    setError(null);
    try {
      const croppedFile = await createCroppedFile(pendingFile, cropAspectRatio, cropZoom, cropX, cropY);
      replacePreview(URL.createObjectURL(croppedFile));
      await uploadFile(croppedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '크롭 업로드에 실패했습니다.');
    }
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
          className="relative h-28 w-40 overflow-hidden rounded border border-border bg-muted"
          onPointerDown={handleCropPointerDown}
          onPointerMove={handleCropPointerMove}
          onPointerUp={handleCropPointerUp}
          onPointerCancel={handleCropPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="미리보기"
            className={enableCrop && pendingFile ? 'h-full w-full cursor-grab object-cover active:cursor-grabbing select-none' : 'h-full w-full object-cover'}
            draggable={false}
            style={enableCrop && pendingFile ? { objectPosition: `${cropX}% ${cropY}%`, transform: `scale(${cropZoom})` } : undefined}
          />
        </div>
      ) : null}
      {enableCrop && pendingFile ? (
        <div className="space-y-3 rounded border border-border bg-muted/20 p-3">
          <p className="text-xs font-medium text-foreground">이미지 자르기</p>
          <p className="text-xs text-muted-foreground">미리보기 이미지를 직접 드래그해서 위치를 맞춘 뒤 업로드하세요.</p>
          <label className="block text-xs text-muted-foreground">
            확대
            <input type="range" min="1" max="3" step="0.05" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} className="mt-1 w-full" />
          </label>
          <button
            type="button"
            onClick={handleCropUpload}
            disabled={uploading}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {uploading ? '업로드 중...' : '자르고 업로드'}
          </button>
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {uploading ? <p className="text-sm text-muted-foreground">업로드 중...</p> : null}
    </div>
  );
}

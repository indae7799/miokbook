'use client';

import { useState, useRef } from 'react';
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

/** 서버가 읽을 수 있도록 MIME 이 비었거나 octet-stream 이면 확장자 기준 타입으로 File 재생성 */
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

export interface ImagePreviewUploaderProps {
  storagePath: string;
  onUploadComplete: (url: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  /** 파일 선택 직후(업로드 전) 원본 가로·세로 픽셀 */
  onImageDimensions?: (width: number, height: number) => void;
}

export default function ImagePreviewUploader({
  storagePath,
  onUploadComplete,
  onUploadingChange,
  onImageDimensions,
}: ImagePreviewUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const resolvedType = resolveImageContentType(file);
    if (!resolvedType) {
      setError('JPEG, PNG, WEBP만 업로드 가능합니다. (.jpg · .png · .webp 파일인지 확인하세요.)');
      return;
    }
    const fileToSend = toUploadableFile(file);
    if (file.size > MAX_SIZE_BYTES) {
      setError('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    if (onImageDimensions) {
      try {
        const { width, height } = await readImageDimensions(fileToSend);
        if (width > 0 && height > 0) onImageDimensions(width, height);
      } catch {
        /* 크기만 못 읽은 경우 업로드는 계속 */
      }
    }

    setPreviewUrl(URL.createObjectURL(fileToSend));
    setUploading(true);
    onUploadingChange?.(true);
    try {
      if (!user) throw new Error('로그인이 필요합니다.');
      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append('file', fileToSend);
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
        throw new Error(parts.join(' — '));
      }

      const { url } = await res.json();
      onUploadComplete(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
        disabled={uploading}
        className="block text-sm min-h-[48px] file:min-h-[48px]"
      />
      {previewUrl && (
        <div className="relative w-40 h-28 rounded border border-border overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL 미리보기 */}
          <img src={previewUrl} alt="미리보기" className="w-full h-full object-cover" />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {uploading && <p className="text-sm text-muted-foreground">업로드 중…</p>}
    </div>
  );
}

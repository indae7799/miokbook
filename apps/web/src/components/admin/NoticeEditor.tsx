'use client';

import { useRef, useState } from 'react';
import { Bold, Italic, Heading2, List, Minus, Paperclip, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import { getAdminToken } from '@/lib/auth-token';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

interface UploadedFile {
  name: string;
  url: string;
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after = '',
  placeholder = '',
): string {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end) || placeholder;
  return (
    textarea.value.substring(0, start) +
    before +
    selected +
    after +
    textarea.value.substring(end)
  );
}

function setCaretAfterInsert(
  textarea: HTMLTextAreaElement,
  before: string,
  placeholder: string,
  selected: string,
) {
  const start = textarea.selectionStart;
  const newPos = start + before.length + (selected || placeholder).length;
  setTimeout(() => {
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
  }, 0);
}

const TOOLBAR_ACTIONS = [
  {
    icon: Bold,
    label: '굵게',
    before: '**',
    after: '**',
    placeholder: '굵은 텍스트',
  },
  {
    icon: Italic,
    label: '기울기',
    before: '*',
    after: '*',
    placeholder: '기울임 텍스트',
  },
  {
    icon: Heading2,
    label: '제목',
    before: '\n## ',
    after: '',
    placeholder: '제목',
  },
  {
    icon: List,
    label: '목록',
    before: '\n- ',
    after: '',
    placeholder: '목록 항목',
  },
  {
    icon: Minus,
    label: '구분선',
    before: '\n\n---\n\n',
    after: '',
    placeholder: '',
  },
] as const;

export default function NoticeEditor({ value, onChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((s) => s.user);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  function applyFormat(before: string, after: string, placeholder: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selected = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    const newValue = insertAtCursor(textarea, before, after, placeholder);
    onChange(newValue);
    setCaretAfterInsert(textarea, before, placeholder, selected);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = '';

    setUploading(true);
    try {
      const token = await getAdminToken(user);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-file', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? '업로드에 실패했습니다.');
      }

      const { url } = await res.json();
      const markdownLink = `[📎 ${file.name}](${url})`;

      // 커서 위치에 삽입
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const newValue =
          value.substring(0, start) +
          '\n' + markdownLink + '\n' +
          value.substring(start);
        onChange(newValue);
      } else {
        onChange(value + '\n' + markdownLink + '\n');
      }

      setUploadedFiles((prev) => [...prev, { name: file.name, url }]);
      toast.success(`"${file.name}" 첨부되었습니다.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  }

  function removeAttachment(fileUrl: string) {
    setUploadedFiles((prev) => prev.filter((f) => f.url !== fileUrl));
    // 본문에서 해당 링크 제거
    const escaped = fileUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\n?\\[📎 [^\\]]+\\]\\(${escaped}\\)\\n?`, 'g');
    onChange(value.replace(regex, '\n'));
  }

  return (
    <div className="space-y-2">
      {/* 툴바 */}
      <div className="flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-input bg-muted/40 px-2 py-1.5">
        {TOOLBAR_ACTIONS.map(({ icon: Icon, label, before, after, placeholder }) => (
          <button
            key={label}
            type="button"
            title={label}
            onClick={() => applyFormat(before, after, placeholder)}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <Icon className="size-3.5" />
          </button>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        {/* 파일 첨부 */}
        <button
          type="button"
          title="파일 첨부"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Paperclip className="size-3.5" />
          )}
          {uploading ? '업로드 중...' : '파일 첨부'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png,.webp"
          onChange={handleFileUpload}
        />
      </div>

      {/* 텍스트 에리어 */}
      <textarea
        ref={textareaRef}
        className="min-h-[300px] w-full rounded-b-md border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="본문을 작성해 주세요.&#10;&#10;## 제목 (H2)&#10;**굵은 글자**&#10;*기울임*&#10;- 목록"
        spellCheck={false}
      />

      {/* 첨부 파일 목록 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">이번 세션 첨부 파일</p>
          {uploadedFiles.map((f) => (
            <div
              key={f.url}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-xs text-foreground underline-offset-2 hover:underline"
                >
                  {f.name}
                </a>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(f.url)}
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        지원 형식: PDF, Word, Excel, PPT, TXT, ZIP, 이미지 (최대 20MB)
      </p>
    </div>
  );
}

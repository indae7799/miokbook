'use client';

import { Input } from '@/components/ui/input';

export interface InternalLinkPickerProps {
  value: string;
  onChange: (url: string) => void;
}

const QUICK_OPTIONS: { value: string; label: string }[] = [
  { value: '/', label: '홈' },
  { value: '/content', label: '콘텐츠' },
  { value: '/concerts', label: '북콘서트' },
  { value: '/events', label: '이벤트' },
];

export default function InternalLinkPicker({ value, onChange }: InternalLinkPickerProps) {
  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="/content/video/slug 또는 /concerts/concert-slug"
        className="min-h-[48px]"
      />
      <div className="flex flex-wrap gap-1.5">
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        상세로 바로 보내려면 예: <span className="font-mono">/content/video/robot</span>,
        <span className="font-mono"> /concerts/concert-20260404</span>
      </p>
    </div>
  );
}

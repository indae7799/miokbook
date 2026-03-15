'use client';

import { useMemo } from 'react';

export interface InternalLinkPickerProps {
  value: string;
  onChange: (url: string) => void;
}

const INTERNAL_OPTIONS: { value: string; label: string }[] = [
  { value: '/', label: '홈' },
  { value: '/books', label: '도서 목록' },
  { value: '/events', label: '이벤트' },
  { value: '/content', label: '콘텐츠' },
];

export default function InternalLinkPicker({ value, onChange }: InternalLinkPickerProps) {
  const options = useMemo(() => INTERNAL_OPTIONS, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-h-[48px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {value && !options.some((o) => o.value === value) && (
        <option value={value}>
          (현재: {value})
        </option>
      )}
    </select>
  );
}

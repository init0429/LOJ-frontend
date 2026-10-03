"use client";

import { LANGUAGE_LABELS } from "@/lib/languages";

export default function LanguageSelect({ value, onChange, disabled = false }: {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0">
      <select
        aria-label="프로그래밍 언어"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="max-w-full bg-(--paper-raised) text-(--text) text-xs border border-(--rule) rounded-md px-3 py-2"
      >
        {Object.entries(LANGUAGE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      {value === "typescript" && <p className="mt-1 text-xs text-(--text-dim)">타입 제거 방식 · enum/namespace 및 외부 패키지 미지원</p>}
    </div>
  );
}

"use client";

import { LANGUAGE_LABELS } from "@/lib/languages";

export default function LanguageSelect({ value, onChange, disabled = false }: {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <label className="flex items-center gap-2 text-sm font-bold text-print-ink">
        언어
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="input w-auto max-w-full py-1.5 text-sm font-semibold"
        >
          {Object.entries(LANGUAGE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      {value === "typescript" && (
        <p className="notice text-xs">타입만 지우고 실행합니다. enum, namespace, 외부 패키지는 쓸 수 없습니다.</p>
      )}
    </div>
  );
}

"use client";

import { ChevronDown } from "lucide-react";
import { LANGUAGE_LABELS } from "@/lib/languages";

/** 편집기 위의 언어 고르기. 테두리 없는 버튼처럼 보이고 누르면 목록이 열린다. */
export default function LanguageSelect({ value, onChange, disabled = false, languages }: {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
  /** 고를 수 있는 언어(함수 구현에는 SQL이 없다). 생략하면 모든 언어 */
  languages?: string[];
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <label className="relative inline-flex items-center">
        <span className="sr-only">언어</span>
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-7 appearance-none rounded-md bg-transparent py-0 pr-7 pl-2 text-[13px] font-medium text-muted [field-sizing:content] hover:bg-fill hover:text-fg disabled:opacity-50"
        >
          {Object.entries(LANGUAGE_LABELS)
            .filter(([id]) => !languages || languages.includes(id))
            .map(([id, label]) => (
              <option key={id} value={id} className="bg-surface text-fg">{label}</option>
            ))}
        </select>
        <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2 text-muted" />
      </label>
      {value === "typescript" && (
        <p className="notice text-xs">타입만 지우고 실행합니다. enum, namespace, 외부 패키지는 쓸 수 없습니다.</p>
      )}
    </div>
  );
}

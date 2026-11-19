"use client";

import { CODE_MODE_LABELS, type CodeMode } from "@/lib/code-mode";

const ORDER: CodeMode[] = ["function", "program"];
const HINTS: Record<CodeMode, string> = {
  function: "함수(메서드)만 씁니다. 입력을 읽고 답을 출력하는 부분과 기본 라이브러리는 채점할 때 붙습니다.",
  program: "표준 입력을 읽고 표준 출력에 답을 쓰는 프로그램 전체를 씁니다.",
};

/** 편집기 위의 코드 형식 고르기. 함수 구현을 받는 문제에서만 보인다. */
export default function CodeModeToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: CodeMode;
  onChange: (mode: CodeMode) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="코드 형식" className="flex items-center gap-0.5">
      {ORDER.map((mode) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          title={HINTS[mode]}
          disabled={disabled}
          onClick={() => onChange(mode)}
          className="chip h-7! px-2.5! text-[13px]!"
        >
          {CODE_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}

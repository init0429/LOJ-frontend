"use client";

import { useState } from "react";
import CodeEditor from "@/components/CodeEditor";
import { SAVE_NOTE, SettingRow, SettingsHeading, Switch } from "@/components/SettingsShell";
import { usePreferences } from "@/hooks/usePreferences";
import { DEFAULT_PREFERENCES, FONT_SIZES, TAB_SIZES } from "@/lib/preferences";

// 들여쓰기, 괄호, 긴 줄이 다 들어 있어 설정을 바꿔 보기 좋은 예시
const SAMPLE = `def solve(numbers):
    total = 0
    for n in numbers:
        if n % 2 == 0:
            total += n
    return total


print(solve([int(x) for x in input().split()]), "← 긴 줄은 자동 줄 바꿈을 켜면 편집기 너비에서 접혀 보입니다.")
`;

export default function EditorSettings() {
  const [preferences, update] = usePreferences();
  const [sample, setSample] = useState(SAMPLE);

  return (
    <>
      <SettingsHeading title="에디터" lead={`문제와 대회 화면의 코드 편집기에 적용됩니다. ${SAVE_NOTE}`} />

      <SettingRow label="글자 크기" htmlFor="editor-font-size">
        <select
          id="editor-font-size"
          value={preferences.editorFontSize}
          onChange={(event) => update({ editorFontSize: Number(event.target.value) })}
          className="input w-32"
        >
          {FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
        </select>
      </SettingRow>

      <SettingRow label="탭 크기" htmlFor="editor-tab-size" hint="Tab을 한 번 누르면 들어가는 칸 수입니다.">
        <select
          id="editor-tab-size"
          value={preferences.editorTabSize}
          onChange={(event) => update({ editorTabSize: Number(event.target.value) })}
          className="input w-32"
        >
          {TAB_SIZES.map((size) => <option key={size} value={size}>{size}칸</option>)}
        </select>
      </SettingRow>

      <SettingRow label="자동 줄 바꿈" htmlFor="editor-word-wrap" hint="긴 줄을 편집기 너비에 맞춰 접어 보입니다.">
        <Switch id="editor-word-wrap" checked={preferences.editorWordWrap} onChange={(next) => update({ editorWordWrap: next })} />
      </SettingRow>

      <SettingRow label="괄호 자동 닫기" htmlFor="editor-auto-close" hint="괄호나 따옴표를 열면 닫는 것도 함께 넣습니다.">
        <Switch id="editor-auto-close" checked={preferences.editorAutoClose} onChange={(next) => update({ editorAutoClose: next })} />
      </SettingRow>

      <SettingRow
        label="함수형 문제의 기본 형식"
        htmlFor="editor-code-mode"
        hint="함수 구현도 받는 문제를 처음 열 때의 형식입니다. 문제에서 형식을 바꾸면 그 문제는 바꾼 형식으로 열립니다."
      >
        <select
          id="editor-code-mode"
          value={preferences.codeMode}
          onChange={(event) => update({ codeMode: event.target.value === "program" ? "program" : "function" })}
          className="input w-56"
        >
          <option value="function">함수 구현 (class Solution 등)</option>
          <option value="program">전체 프로그램 (표준 입출력)</option>
        </select>
      </SettingRow>

      <section className="mt-6" aria-labelledby="editor-preview-title">
        <div className="flex items-center justify-between gap-3">
          <h3 id="editor-preview-title" className="text-sm font-medium">미리 보기</h3>
          <button
            type="button"
            onClick={() => {
              const { editorFontSize, editorTabSize, editorWordWrap, editorAutoClose } = DEFAULT_PREFERENCES;
              update({ editorFontSize, editorTabSize, editorWordWrap, editorAutoClose });
              setSample(SAMPLE);
            }}
            className="btn btn-sm btn-line"
          >
            기본값으로 되돌리기
          </button>
        </div>
        <p className="mt-1 text-[13px] text-muted">여기에 직접 써 볼 수 있습니다. 쓴 내용은 저장하지 않습니다.</p>
        <div className="box mt-3 overflow-hidden">
          <CodeEditor language="python" value={sample} onChange={setSample} height="260px" />
        </div>
      </section>
    </>
  );
}

"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useTheme } from "@/hooks/useTheme";
import { codeFontFamily } from "@/lib/fonts";
import { MONACO_LANGUAGE } from "@/lib/languages";

// 편집기 바탕을 패널 색(--surface)과 맞춘다. 나머지 색은 기본 테마를 그대로 쓴다.
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("loj-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#262626",
      "editor.lineHighlightBackground": "#2f2f2f",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#6b6b6b",
      "editorLineNumber.activeForeground": "#c8c8c8",
      "editorGutter.background": "#262626",
    },
  });
  monaco.editor.defineTheme("loj-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
      "editor.lineHighlightBackground": "#f5f5f5",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#a8a8a8",
      "editorLineNumber.activeForeground": "#4a4a4a",
    },
  });
};

// 웹폰트가 늦게 도착하면 글자 폭을 다시 재야 커서 위치가 어긋나지 않는다.
const remeasure: OnMount = (_editor, monaco) => {
  void document.fonts.ready.then(() => monaco.editor.remeasureFonts());
};

export default function CodeEditor({
  language,
  value,
  onChange,
  readOnly = false,
  height = "100%",
  fontSize = 14,
}: {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  fontSize?: number;
}) {
  const { theme } = useTheme();
  return (
    <Editor
      height={height}
      language={MONACO_LANGUAGE[language] ?? "plaintext"}
      theme={theme === "dark" ? "loj-dark" : "loj-light"}
      beforeMount={defineThemes}
      value={value}
      onMount={remeasure}
      onChange={(next) => onChange?.(next ?? "")}
      loading={<p className="notice text-sm">편집기를 불러오는 중…</p>}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize,
        fontFamily: codeFontFamily,
        lineHeight: 1.7,
        padding: { top: 12, bottom: 12 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        renderLineHighlight: readOnly ? "none" : "line",
        overviewRulerLanes: 0,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}

"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useTheme } from "@/hooks/useTheme";
import { code } from "@/lib/fonts";
import { MONACO_LANGUAGE } from "@/lib/languages";

// 답안지 색에 맞춘 편집기. 줄 번호는 인쇄 분홍, 글자는 사인펜.
const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme("loj-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1f161a",
      "editorGutter.background": "#ffffff",
      "editorLineNumber.foreground": "#f08aa2",
      "editorLineNumber.activeForeground": "#c02f55",
      "editor.lineHighlightBackground": "#fdf1f4",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#fbd0da",
      "editor.inactiveSelectionBackground": "#fde8ed",
      "editorCursor.foreground": "#1f161a",
      "editorIndentGuide.background1": "#fbe1e7",
      "editorIndentGuide.activeBackground1": "#f08aa2",
      "editorWidget.background": "#ffffff",
      "editorWidget.border": "#f6c6d1",
      "scrollbarSlider.background": "#f6c6d180",
      "scrollbarSlider.hoverBackground": "#f08aa280",
    },
  });
  monaco.editor.defineTheme("loj-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1f171b",
      "editor.foreground": "#f7eef1",
      "editorGutter.background": "#1f171b",
      "editorLineNumber.foreground": "#8f475b",
      "editorLineNumber.activeForeground": "#f393ab",
      "editor.lineHighlightBackground": "#2a1d23",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#5a3040",
      "editor.inactiveSelectionBackground": "#33212a",
      "editorCursor.foreground": "#f7eef1",
      "editorIndentGuide.background1": "#33212a",
      "editorIndentGuide.activeBackground1": "#8f475b",
      "editorWidget.background": "#1f171b",
      "editorWidget.border": "#4b2c37",
      "scrollbarSlider.background": "#4b2c3780",
      "scrollbarSlider.hoverBackground": "#8f475b80",
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
  fontSize = 15,
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
      value={value}
      beforeMount={defineThemes}
      onMount={remeasure}
      onChange={(next) => onChange?.(next ?? "")}
      loading={<p className="notice text-sm">편집기를 불러오는 중…</p>}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize,
        fontFamily: `${code.style.fontFamily}, ui-monospace, monospace`,
        lineHeight: 1.7,
        padding: { top: 16, bottom: 16 },
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

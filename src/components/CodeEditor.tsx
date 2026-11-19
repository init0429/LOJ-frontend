"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { usePreferences } from "@/hooks/usePreferences";
import { useTheme } from "@/hooks/useTheme";
import { codeFontFamily } from "@/lib/fonts";
import { MONACO_LANGUAGE } from "@/lib/languages";

// 편집기 바탕을 패널 색(--surface)과 맞춘다. 기본 테마는 나머지 색을 Monaco 기본 그대로 쓴다.
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
  // Interrupt: VS Code Interrupt 테마의 편집기 색과 문법 색(Tokyo Night). 바탕은 패널 색(--surface)과 같다.
  monaco.editor.defineTheme("interrupt-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "a9b1d6" },
      { token: "comment", foreground: "565f89", fontStyle: "italic" },
      { token: "keyword", foreground: "bb9af7" },
      { token: "string", foreground: "9ece6a" },
      { token: "number", foreground: "f5a97f" },
      { token: "type", foreground: "2ac3de" },
      { token: "type.identifier", foreground: "2ac3de" },
      { token: "delimiter", foreground: "9abdf5" },
      { token: "operator", foreground: "89ddff" },
      { token: "regexp", foreground: "b4f9f8" },
      { token: "tag", foreground: "ff6b6b" },
      { token: "attribute.name", foreground: "bb9af7" },
      { token: "variable", foreground: "c0caf5" },
      { token: "variable.predefined", foreground: "ff6b6b" },
    ],
    colors: {
      "editor.background": "#0d0f15",
      "editor.foreground": "#a9b1d6",
      "editor.lineHighlightBackground": "#151823",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#ff2e8838",
      "editorCursor.foreground": "#ff2e88",
      "editorLineNumber.foreground": "#3a3f4e",
      "editorLineNumber.activeForeground": "#ff2e88",
      "editorGutter.background": "#0d0f15",
      "editorIndentGuide.background1": "#181b26",
      "editorBracketMatch.border": "#ff2e8880",
    },
  });
  monaco.editor.defineTheme("interrupt-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "8a90a2", fontStyle: "italic" },
      { token: "keyword", foreground: "8a3ffc" },
      { token: "string", foreground: "3d7a00" },
      { token: "number", foreground: "b85a00" },
      { token: "type", foreground: "0b7f9c" },
      { token: "type.identifier", foreground: "0b7f9c" },
      { token: "operator", foreground: "0b7f9c" },
      { token: "tag", foreground: "d61f3a" },
      { token: "variable.predefined", foreground: "d61f3a" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.lineHighlightBackground": "#f5f6fa",
      "editor.lineHighlightBorder": "#00000000",
      "editor.selectionBackground": "#d4166f26",
      "editorCursor.foreground": "#d4166f",
      "editorLineNumber.foreground": "#a3a7b5",
      "editorLineNumber.activeForeground": "#d4166f",
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
  fontSize,
}: {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  /** 생략하면 설정 화면에서 고른 크기 */
  fontSize?: number;
}) {
  const { theme, palette } = useTheme();
  const [preferences] = usePreferences();
  const autoClose = preferences.editorAutoClose ? "languageDefined" : "never";
  return (
    <Editor
      height={height}
      language={MONACO_LANGUAGE[language] ?? "plaintext"}
      theme={`${palette === "interrupt" ? "interrupt" : "loj"}-${theme}`}
      beforeMount={defineThemes}
      value={value}
      onMount={remeasure}
      onChange={(next) => onChange?.(next ?? "")}
      loading={<p className="notice text-sm">편집기를 불러오는 중…</p>}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: fontSize ?? preferences.editorFontSize,
        fontFamily: codeFontFamily,
        lineHeight: 1.7,
        padding: { top: 12, bottom: 12 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: preferences.editorTabSize,
        // 코드 내용으로 들여쓰기 폭을 짐작하지 않고 설정한 값을 쓴다.
        detectIndentation: false,
        wordWrap: preferences.editorWordWrap ? "on" : "off",
        autoClosingBrackets: autoClose,
        autoClosingQuotes: autoClose,
        renderLineHighlight: readOnly ? "none" : "line",
        overviewRulerLanes: 0,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      }}
    />
  );
}

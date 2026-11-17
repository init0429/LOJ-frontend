"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useTheme } from "@/hooks/useTheme";
import { code } from "@/lib/fonts";
import { MONACO_LANGUAGE } from "@/lib/languages";

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
      theme={theme === "dark" ? "vs-dark" : "light"}
      value={value}
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

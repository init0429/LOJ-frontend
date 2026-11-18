import { useEffect, useRef } from "react";

/** 버튼 title과 aria-keyshortcuts에 쓰는 설명 */
export const RUN_SHORTCUT = { label: "⌘/Ctrl+Enter", aria: "Control+Enter Meta+Enter" };
export const SUBMIT_SHORTCUT = { label: "⌘/Ctrl+Shift+Enter", aria: "Control+Shift+Enter Meta+Shift+Enter" };

/**
 * ⌘/Ctrl+Enter로 예제 실행, ⌘/Ctrl+Shift+Enter로 제출.
 * 편집기 안에서도 동작하도록 편집기보다 먼저(capture 단계에서) 받는다.
 */
export function useRunShortcuts(onRun: () => void, onSubmit: () => void) {
  const handlers = useRef({ onRun, onSubmit });
  useEffect(() => {
    handlers.current = { onRun, onSubmit };
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || event.altKey || event.repeat) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey) handlers.current.onSubmit();
      else handlers.current.onRun();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}

"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as key, THEME_MODE_EVENT as modeEvent, readThemeMode, type ThemeMode } from "@/lib/theme";

export type { ThemeMode } from "@/lib/theme";

type Theme = "light" | "dark";

function preferredTheme(): Theme {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    document.documentElement.dataset.theme = preferredTheme();
    onChange();
  };
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) sync();
  };
  media.addEventListener("change", sync);
  window.addEventListener("storage", onStorage);
  sync();
  return () => {
    observer.disconnect();
    media.removeEventListener("change", sync);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, (): Theme => "light");
  const toggleTheme = () => setThemeMode(snapshot() === "dark" ? "light" : "dark");
  return { theme, toggleTheme };
}

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(key);
    else localStorage.setItem(key, mode);
  } catch {}
  // 화면 색이 그대로여도(시스템 설정과 같은 색을 고른 경우) 고른 값이 바뀌었음을 알린다.
  document.documentElement.dataset.theme = preferredTheme();
  window.dispatchEvent(new Event(modeEvent));
}

function subscribeMode(onChange: () => void) {
  const unsubscribe = subscribe(onChange);
  window.addEventListener(modeEvent, onChange);
  return () => {
    unsubscribe();
    window.removeEventListener(modeEvent, onChange);
  };
}

/** 설정 화면의 테마 고르기. 머리줄의 테마 단추로 바꿔도 따라 바뀐다. */
export function useThemeMode(): [ThemeMode, (mode: ThemeMode) => void] {
  return [useSyncExternalStore(subscribeMode, readThemeMode, (): ThemeMode => "system"), setThemeMode];
}

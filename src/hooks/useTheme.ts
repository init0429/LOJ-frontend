"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_KEY as key,
  THEME_MODE_EVENT as modeEvent,
  readThemeMode,
  resolveTheme,
  toggledThemeMode,
  type Brightness,
  type ThemeMode,
  type ThemePalette,
} from "@/lib/theme";

export type { ThemeMode } from "@/lib/theme";

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/** 고른 테마를 <html>의 data-theme(밝기)와 data-palette(색 묶음)에 적용한다 */
function apply() {
  const { brightness, palette } = resolveTheme(readThemeMode(), prefersDark());
  const root = document.documentElement;
  root.dataset.theme = brightness;
  if (palette === "default") delete root.dataset.palette;
  else root.dataset.palette = palette;
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    apply();
    onChange();
  };
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-palette"] });
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

// 같은 값이면 같은 문자열을 돌려줘야 useSyncExternalStore가 매번 다시 그리지 않는다.
function snapshot(): string {
  const root = document.documentElement;
  return `${root.dataset.theme === "dark" ? "dark" : "light"}:${root.dataset.palette === "interrupt" ? "interrupt" : "default"}`;
}

/** 지금 화면의 밝기와 색 묶음. 머리줄의 해·달 단추는 색 묶음은 두고 밝기만 바꾼다. */
export function useTheme() {
  const [theme, palette] = useSyncExternalStore(subscribe, snapshot, () => "light:default").split(":") as [Brightness, ThemePalette];
  const toggleTheme = () => setThemeMode(toggledThemeMode(readThemeMode(), theme));
  return { theme, palette, toggleTheme };
}

export function setThemeMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(key);
    else localStorage.setItem(key, mode);
  } catch {}
  // 화면 색이 그대로여도(시스템 설정과 같은 색을 고른 경우) 고른 값이 바뀌었음을 알린다.
  apply();
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

"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_EVENT,
  PREFERENCES_KEY,
  parsePreferences,
  readPreferencesRaw,
  savePreferences,
  type Preferences,
} from "@/lib/preferences";

// 같은 글자면 같은 객체를 돌려줘야 useSyncExternalStore가 매번 다시 그리지 않는다.
let cachedRaw: string | null | undefined;
let cached = DEFAULT_PREFERENCES;

function snapshot(): Preferences {
  const raw = readPreferencesRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parsePreferences(raw);
  }
  return cached;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFERENCES_KEY || event.key === null) onChange();
  };
  window.addEventListener(PREFERENCES_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PREFERENCES_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** 이 브라우저의 편집기·보기 설정. 설정 화면에서 바꾸면 열려 있는 화면에도 바로 반영된다. */
export function usePreferences(): [Preferences, (change: Partial<Preferences>) => void] {
  const preferences = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_PREFERENCES);
  return [preferences, savePreferences];
}

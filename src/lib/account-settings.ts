import { LANGUAGE_EVENT, LANGUAGE_KEY } from "./drafts";
import { LANGUAGE_LABELS } from "./languages";
import {
  PREFERENCES_EVENT,
  PREFERENCES_KEY,
  compactPreferences,
  parsePreferences,
  type Preferences,
} from "./preferences";
import { THEME_KEY, type ThemeMode } from "./theme";

// 로그인한 사용자의 설정을 계정(user_settings.settings)에 둔다. 화면은 지금처럼 localStorage를 읽고,
// components/AccountSettingsSync가 로그인할 때 계정 값을 내려받고 바뀔 때마다 올린다.

/** 계정에 저장하는 설정 한 벌. 편집기·보기 설정은 기본값과 다른 항목만 담는다. */
export interface AccountSettings {
  preferences: Partial<Preferences>;
  /** 문제를 처음 열 때 고를 언어. 고른 적이 없으면 null */
  language: string | null;
  theme: ThemeMode;
}

const validLanguage = (value: unknown): string | null =>
  typeof value === "string" && Object.hasOwn(LANGUAGE_LABELS, value) ? value : null;
const validTheme = (value: unknown): ThemeMode => (value === "light" || value === "dark" ? value : "system");

/** 계정에서 받은 값을 검사해 모양을 맞춘다. 모르는 항목은 버리고, 틀린 항목은 기본값으로. */
export function parseAccountSettings(value: unknown): AccountSettings {
  const saved = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  return {
    preferences: compactPreferences(parsePreferences(JSON.stringify(saved.preferences ?? {}))),
    language: validLanguage(saved.language),
    theme: validTheme(saved.theme),
  };
}

/** 이 브라우저에 저장된 설정 */
export function readLocalSettings(): AccountSettings {
  const read = (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  return {
    preferences: compactPreferences(parsePreferences(read(PREFERENCES_KEY))),
    language: validLanguage(read(LANGUAGE_KEY)),
    theme: validTheme(read(THEME_KEY)),
  };
}

/** 같은 설정인지. 항목 순서가 늘 같게 만들어 두었으므로 JSON으로 비교한다. */
export const sameSettings = (a: AccountSettings, b: AccountSettings) =>
  JSON.stringify(parseAccountSettings(a)) === JSON.stringify(parseAccountSettings(b));

/**
 * 계정 설정을 이 브라우저에 쓴다. 편집기·보기 설정과 언어가 바뀌었음을 알린다.
 * 테마는 화면 색까지 바꿔야 하므로 부르는 쪽에서 setThemeMode로 따로 적용한다.
 */
export function writeLocalSettings(settings: AccountSettings) {
  try {
    const preferences = JSON.stringify(settings.preferences);
    if (preferences === "{}") localStorage.removeItem(PREFERENCES_KEY);
    else localStorage.setItem(PREFERENCES_KEY, preferences);
    if (settings.language) localStorage.setItem(LANGUAGE_KEY, settings.language);
    else localStorage.removeItem(LANGUAGE_KEY);
    window.dispatchEvent(new Event(PREFERENCES_EVENT));
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  } catch {}
}

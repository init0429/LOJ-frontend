// 테마 저장 위치. 화면 머리줄의 테마 단추, 설정 화면, 계정 설정 동기화가 함께 쓴다.
// (app/layout.tsx의 깜빡임 방지 스크립트도 같은 키를 읽는다.)

export const THEME_KEY = "loj-theme";
/** 같은 탭 안에서 고른 테마가 바뀌었음을 알리는 이벤트 */
export const THEME_MODE_EVENT = "loj-theme-mode";

/** 고른 테마. "system"은 따로 고르지 않아 운영체제 설정을 따르는 것 */
export type ThemeMode = "light" | "dark" | "system";

export function readThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "system";
}

// 테마 저장 위치. 화면 머리줄의 테마 단추, 설정 화면, 계정 설정 동기화가 함께 쓴다.
// (app/layout.tsx의 깜빡임 방지 스크립트도 같은 키를 읽고, 아래 resolveTheme과 같은 규칙을 따른다.)
//
// 화면에는 두 가지로 나눠 적용한다.
//   <html data-theme="light|dark">     밝기. 기존 CSS와 해·달 단추, 편집기 테마가 이것을 본다.
//   <html data-palette="interrupt">    색 묶음. 기본 색이면 붙이지 않는다(globals.css가 색 토큰만 덮어쓴다).

export const THEME_KEY = "loj-theme";
/** 같은 탭 안에서 고른 테마가 바뀌었음을 알리는 이벤트 */
export const THEME_MODE_EVENT = "loj-theme-mode";

/** 고른 테마. "system"은 따로 고르지 않아 운영체제 밝기를 따라 기본 라이트·다크를 쓰는 것 */
export type ThemeMode = "system" | "light" | "dark" | "interrupt-light" | "interrupt-dark";
export type Brightness = "light" | "dark";
export type ThemePalette = "default" | "interrupt";

/** 설정 화면의 테마 고르기 칸 */
export const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "시스템 설정에 맞춤" },
  { value: "light", label: "기본 라이트" },
  { value: "dark", label: "기본 다크" },
  { value: "interrupt-light", label: "Interrupt Light" },
  { value: "interrupt-dark", label: "Interrupt Dark" },
];

export const isThemeMode = (value: unknown): value is ThemeMode =>
  THEME_OPTIONS.some((option) => option.value === value);

export function readThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (isThemeMode(saved)) return saved;
  } catch {}
  return "system";
}

/** 고른 테마를 화면에 쓸 밝기와 색 묶음으로 */
export function resolveTheme(mode: ThemeMode, prefersDark: boolean): { brightness: Brightness; palette: ThemePalette } {
  switch (mode) {
    case "light":
    case "dark":
      return { brightness: mode, palette: "default" };
    case "interrupt-light":
      return { brightness: "light", palette: "interrupt" };
    case "interrupt-dark":
      return { brightness: "dark", palette: "interrupt" };
    default:
      return { brightness: prefersDark ? "dark" : "light", palette: "default" };
  }
}

/** 머리줄의 해·달 단추: 고른 색 묶음은 그대로 두고 밝기만 바꾼다 */
export function toggledThemeMode(mode: ThemeMode, current: Brightness): ThemeMode {
  const next: Brightness = current === "dark" ? "light" : "dark";
  if (mode === "interrupt-light" || mode === "interrupt-dark") return `interrupt-${next}`;
  return next;
}

/**
 * app/layout.tsx가 첫 화면을 그리기 전에 실행하는 스크립트(테마가 잠깐 다르게 보이지 않게).
 * React보다 먼저 돌아야 해서 문자열로 넣는다. 규칙은 resolveTheme과 같다.
 */
export const THEME_BOOT_SCRIPT = `(function(){var m;try{m=localStorage.getItem('${THEME_KEY}')}catch(e){}var d=document.documentElement;var i=m==='interrupt-light'||m==='interrupt-dark';var b=m==='light'||m==='interrupt-light'?'light':m==='dark'||m==='interrupt-dark'?'dark':(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');d.dataset.theme=b;if(i)d.dataset.palette='interrupt';else delete d.dataset.palette})()`;

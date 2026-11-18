// 설정 화면에서 고르는 편집기·보기 설정. 계정이 아니라 이 브라우저에 저장한다(서버에 보내지 않는다).
// 값이 망가졌거나 예전 형식이어도 화면이 깨지지 않도록 항목마다 따로 검사하고, 틀린 항목만 기본값으로 둔다.

export interface Preferences {
  /** 편집기 글자 크기(px) */
  editorFontSize: number;
  /** Tab 한 번에 들어가는 칸 수 */
  editorTabSize: number;
  /** 긴 줄을 편집기 너비에서 접어 보이기 */
  editorWordWrap: boolean;
  /** 괄호와 따옴표를 열면 닫는 것도 넣기 */
  editorAutoClose: boolean;
  /** 알고리즘 분류를 누르지 않아도 처음부터 보이기 */
  showTags: boolean;
  /** 난이도를 solved.ac 티어로 보기. 끄면 LOJ 난이도로 본다 */
  showTier: boolean;
}

export const PREFERENCES_KEY = "loj-preferences";
/** 같은 탭 안에서 설정이 바뀌었음을 알리는 이벤트(다른 탭은 storage 이벤트로 안다) */
export const PREFERENCES_EVENT = "loj-preferences";

export const FONT_SIZES = [12, 13, 14, 15, 16, 18, 20];
export const TAB_SIZES = [2, 4, 8];

export const DEFAULT_PREFERENCES: Preferences = {
  editorFontSize: 14,
  editorTabSize: 4,
  editorWordWrap: false,
  editorAutoClose: true,
  showTags: false,
  showTier: true,
};

const oneOf = (value: unknown, allowed: number[], fallback: number) =>
  typeof value === "number" && allowed.includes(value) ? value : fallback;
const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

/** 저장된 글자 그대로를 받아 설정으로. 비었거나 읽을 수 없으면 기본값 */
export function parsePreferences(raw: string | null): Preferences {
  let saved: Record<string, unknown> = {};
  try {
    const value: unknown = raw ? JSON.parse(raw) : {};
    if (value && typeof value === "object" && !Array.isArray(value)) saved = value as Record<string, unknown>;
  } catch {}
  const d = DEFAULT_PREFERENCES;
  return {
    editorFontSize: oneOf(saved.editorFontSize, FONT_SIZES, d.editorFontSize),
    editorTabSize: oneOf(saved.editorTabSize, TAB_SIZES, d.editorTabSize),
    editorWordWrap: flag(saved.editorWordWrap, d.editorWordWrap),
    editorAutoClose: flag(saved.editorAutoClose, d.editorAutoClose),
    showTags: flag(saved.showTags, d.showTags),
    showTier: flag(saved.showTier, d.showTier),
  };
}

export function readPreferencesRaw(): string | null {
  try {
    return localStorage.getItem(PREFERENCES_KEY);
  } catch {
    return null;
  }
}

/** 일부만 바꿔 저장하고, 바뀐 전체 설정을 돌려준다. 기본값과 같은 항목은 남기지 않는다. */
export function savePreferences(change: Partial<Preferences>): Preferences {
  const next = parsePreferences(JSON.stringify({ ...parsePreferences(readPreferencesRaw()), ...change }));
  const changed = Object.fromEntries(
    Object.entries(next).filter(([key, value]) => DEFAULT_PREFERENCES[key as keyof Preferences] !== value),
  );
  try {
    if (Object.keys(changed).length === 0) localStorage.removeItem(PREFERENCES_KEY);
    else localStorage.setItem(PREFERENCES_KEY, JSON.stringify(changed));
    window.dispatchEvent(new Event(PREFERENCES_EVENT));
  } catch {}
  return next;
}

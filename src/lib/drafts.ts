import type { CodeMode } from "./code-mode";
import { LANGUAGE_LABELS, STARTER_CODE } from "./languages";

// 문제 화면에서 쓰던 코드와 마지막에 고른 언어를 이 브라우저에 남겨 둔다.
// 새로고침하거나 다른 문제를 보고 와도 이어서 쓸 수 있게 하려는 것이라 코드는 서버에 보내지 않는다.
// (마지막에 고른 언어는 계정 설정에도 맞춰 둔다. components/AccountSettingsSync)
// (대회 화면은 서버의 contest_drafts에 따로 저장한다.)

export const LANGUAGE_KEY = "loj-language";
/** 같은 탭 안에서 기본 언어가 바뀌었음을 알리는 이벤트 */
export const LANGUAGE_EVENT = "loj-language";
// 전체 프로그램은 예전 키를 그대로 써서 이미 저장된 코드를 잃지 않는다. 함수 구현은 끝에 :function을 붙인다.
const draftKey = (problemId: number | string, language: string, mode: CodeMode) =>
  `loj-draft:${problemId}:${language}${mode === "function" ? ":function" : ""}`;
const modeKey = (problemId: number | string) => `loj-mode:${problemId}`;

export function loadLanguage(): string {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && saved in LANGUAGE_LABELS) return saved;
  } catch {}
  return "python";
}

export function saveLanguage(language: string) {
  try {
    if (localStorage.getItem(LANGUAGE_KEY) === language) return;
    localStorage.setItem(LANGUAGE_KEY, language);
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  } catch {}
}

/**
 * 저장해 둔 코드, 없으면 시작 코드. 함수 구현의 시작 코드는 문제마다 달라서 부르는 쪽이 넘긴다.
 */
export function loadDraft(
  problemId: number | string,
  language: string,
  mode: CodeMode = "program",
  starter: string = STARTER_CODE[language] ?? "",
): string {
  try {
    const saved = localStorage.getItem(draftKey(problemId, language, mode));
    if (saved !== null) return saved;
  } catch {}
  return starter;
}

export function saveDraft(
  problemId: number | string,
  language: string,
  code: string,
  mode: CodeMode = "program",
  starter: string = STARTER_CODE[language] ?? "",
) {
  try {
    // 손대지 않은 시작 코드는 남기지 않는다(시작 코드가 바뀌면 새 것을 보이게).
    if (code === starter) localStorage.removeItem(draftKey(problemId, language, mode));
    else localStorage.setItem(draftKey(problemId, language, mode), code);
  } catch {}
}

/** 이 문제에서 마지막에 고른 형식(함수 구현을 받는 문제만). 고른 적이 없으면 null */
export function loadMode(problemId: number | string): CodeMode | null {
  try {
    const saved = localStorage.getItem(modeKey(problemId));
    if (saved === "function" || saved === "program") return saved;
  } catch {}
  return null;
}

export function saveMode(problemId: number | string, mode: CodeMode) {
  try {
    localStorage.setItem(modeKey(problemId), mode);
  } catch {}
}

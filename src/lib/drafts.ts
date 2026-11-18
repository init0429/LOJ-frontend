import { LANGUAGE_LABELS, STARTER_CODE } from "./languages";

// 문제 화면에서 쓰던 코드와 마지막에 고른 언어를 이 브라우저에 남겨 둔다.
// 새로고침하거나 다른 문제를 보고 와도 이어서 쓸 수 있게 하려는 것이라 서버에는 보내지 않는다.
// (대회 화면은 서버의 contest_drafts에 따로 저장한다.)

const LANGUAGE_KEY = "loj-language";
const draftKey = (problemId: number | string, language: string) => `loj-draft:${problemId}:${language}`;

export function loadLanguage(): string {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && saved in LANGUAGE_LABELS) return saved;
  } catch {}
  return "python";
}

export function saveLanguage(language: string) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {}
}

/** 저장해 둔 코드, 없으면 그 언어의 시작 코드 */
export function loadDraft(problemId: number | string, language: string): string {
  try {
    const saved = localStorage.getItem(draftKey(problemId, language));
    if (saved !== null) return saved;
  } catch {}
  return STARTER_CODE[language] ?? "";
}

export function saveDraft(problemId: number | string, language: string, code: string) {
  try {
    // 손대지 않은 시작 코드는 남기지 않는다(시작 코드가 바뀌면 새 것을 보이게).
    if (code === (STARTER_CODE[language] ?? "")) localStorage.removeItem(draftKey(problemId, language));
    else localStorage.setItem(draftKey(problemId, language), code);
  } catch {}
}

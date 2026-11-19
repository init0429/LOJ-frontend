// 코드 형식: 전체 프로그램(표준 입출력) 또는 함수 구현(class Solution 등).
// 함수 구현은 관리자가 시그니처를 정해 둔 문제에서만 고를 수 있고, 시작 코드는 백엔드가 만든다.
import { getTemplates, type ProblemTemplates } from "./function-api";
import { LANGUAGE_LABELS, STARTER_CODE } from "./languages";

export type CodeMode = "program" | "function";

export const CODE_MODE_LABELS: Record<CodeMode, string> = {
  function: "함수 구현",
  program: "전체 프로그램",
};

/** 함수 구현을 받는 문제의 시작 코드와 예제 표기. 받는 문제가 아니면 쓰지 않는다. */
export type FunctionTemplates = ProblemTemplates & { signature: NonNullable<ProblemTemplates["signature"]> };

export const isCodeMode = (value: unknown): value is CodeMode => value === "program" || value === "function";

/**
 * 문제의 함수 구현 시작 코드를 받는다. 시그니처가 없는 문제면 묻지 않는다.
 * failed: 받아야 하는데 못 받았다(그동안은 전체 프로그램만 쓴다).
 */
export async function loadFunctionTemplates(problem: { id: number; signature?: unknown }): Promise<{
  templates: FunctionTemplates | null;
  failed: boolean;
}> {
  if (!problem.signature) return { templates: null, failed: false };
  try {
    const templates = await getTemplates(problem.id);
    return templates.signature
      ? { templates: templates as FunctionTemplates, failed: false }
      : { templates: null, failed: false };
  } catch {
    return { templates: null, failed: true };
  }
}

/** 이 형식과 언어의 시작 코드 */
export function starterCode(language: string, mode: CodeMode, templates: FunctionTemplates | null): string {
  if (mode === "function") return templates?.starters[language] ?? "";
  return STARTER_CODE[language] ?? "";
}

/** 이 형식으로 쓸 수 있는 언어(언어 고르기 칸의 순서). 함수 구현에는 SQL이 없다. */
export function modeLanguages(mode: CodeMode, templates: FunctionTemplates | null): string[] {
  const all = Object.keys(LANGUAGE_LABELS);
  if (mode !== "function" || !templates) return all;
  return all.filter((language) => Object.hasOwn(templates.starters, language));
}

/** 이 형식에서 쓸 언어. 지금 언어를 쓸 수 없으면 Python, 그것도 없으면 첫 언어 */
export function languageFor(mode: CodeMode, templates: FunctionTemplates | null, language: string): string {
  const allowed = modeLanguages(mode, templates);
  if (allowed.includes(language)) return language;
  return allowed.includes("python") ? "python" : allowed[0] ?? language;
}

/** 아직 손대지 않은 코드인지(비었거나 어느 형식·언어의 시작 코드 그대로) */
export function isUntouchedStarter(code: string, templates: FunctionTemplates | null): boolean {
  if (!code.trim()) return true;
  return Object.values(STARTER_CODE).includes(code) || Object.values(templates?.starters ?? {}).includes(code);
}

/** 문제지에 예제를 인자 표기로 보여 줄 때 쓰는 표(테스트케이스 번호 → 표기) */
export function exampleViews(templates: FunctionTemplates | null) {
  return new Map((templates?.examples ?? []).map((example) => [example.id, example]));
}

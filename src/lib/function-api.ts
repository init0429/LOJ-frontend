import { supabase } from "./supabase";
import type { Signature } from "./signature";

/** 백엔드 /signature/preview가 테스트마다 돌려주는 확인 결과 */
export interface TestCheck {
  /** 입력을 인자 표기로 바꾼 것. nums = [2,7,11,15], target = 9 */
  input: string | null;
  /** 답을 값 표기로 바꾼 것. [0,1] */
  output: string | null;
  /** 함수 구현으로는 맞힐 수 없는 이유. 괜찮으면 null */
  error: string | null;
  /** 답이 맞는 값이지만 드라이버가 다른 모양으로 출력할 때, 그 모양(이렇게 고치면 된다) */
  normalized_output: string | null;
}

export interface SignaturePreview {
  /** 백엔드가 정리한 시그니처. 저장할 때는 이것을 쓴다. */
  signature: Signature;
  /** 언어마다 편집기에 처음 보여 줄 코드 */
  starters: Record<string, string>;
  tests: TestCheck[];
}

/** 푸는 화면이 받는 것. 시그니처가 없는 문제면 signature가 null이다. */
export interface ProblemTemplates {
  signature: Signature | null;
  starters: Record<string, string>;
  /** 공개 예제를 인자 표기로 바꾼 것. 바꾸지 못한 칸은 null이라 원문을 보여 준다. */
  examples: { id: number; input: string | null; output: string | null }[];
}

/** 백엔드가 한 번에 검사를 맡는 테스트의 수와 한 칸의 길이(function_problems.py와 같다) */
export const MAX_CHECKED_TESTS = 100;
export const MAX_CHECKED_TEXT = 200_000;

const apiBase = () => (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function readResponse(response: Response): Promise<unknown> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (data as { detail?: unknown }).detail;
    throw new Error(typeof detail === "string" ? detail : `서버 통신 오류 (${response.status})`);
  }
  return data;
}

async function adminPost(path: string, body: unknown): Promise<unknown> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error("로그인이 필요합니다.");
  const response = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body),
  });
  return readResponse(response);
}

/** 관리자: 시그니처를 검사하고 시작 코드와 테스트 확인 결과를 받는다. 시그니처가 잘못되면 그 이유로 실패한다. */
export async function previewSignature(
  signature: Signature,
  tests: { input: string; output: string }[] = [],
): Promise<SignaturePreview> {
  const data = (await adminPost("/signature/preview", { signature, tests })) as SignaturePreview;
  if (!data || typeof data.starters !== "object" || !Array.isArray(data.tests)) {
    throw new Error("미리 보기를 받지 못했습니다.");
  }
  return data;
}

/** 관리자: 인자 표기로 적은 예제를 저장할 입력·출력 텍스트로 바꾼다. 출력을 비우면 output은 null */
export async function convertExample(
  signature: Signature,
  input: string,
  output: string,
): Promise<{ input: string; output: string | null }> {
  const data = (await adminPost("/signature/convert", { signature, input, output })) as {
    input?: unknown;
    output?: unknown;
  };
  if (typeof data.input !== "string") throw new Error("변환 결과를 받지 못했습니다.");
  return { input: data.input, output: typeof data.output === "string" ? data.output : null };
}

/** 푸는 화면: 문제의 시그니처, 언어별 시작 코드, 예제의 인자 표기. 로그인하지 않아도 된다. */
export async function getTemplates(problemId: number): Promise<ProblemTemplates> {
  const response = await fetch(`${apiBase()}/problems/${problemId}/templates`);
  const data = (await readResponse(response)) as ProblemTemplates;
  if (!data || typeof data.starters !== "object" || !Array.isArray(data.examples)) {
    throw new Error("시작 코드를 받지 못했습니다.");
  }
  return data;
}

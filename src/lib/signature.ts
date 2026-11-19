/**
 * 함수형 문제의 시그니처(함수 이름, 인자, 반환형). DB의 problems.signature에 이 모양으로 저장한다.
 * 이름 규칙과 예약어 같은 자세한 검사는 백엔드(/signature/preview)가 한다. 여기서는 화면에서
 * 고칠 수 있는 모양으로 바꾸고 되돌리는 일만 한다.
 */

export interface SignatureParam {
  name: string;
  type: string;
}

export interface Signature {
  function: string;
  params: SignatureParam[];
  returns: string;
  /** 반환형이 void일 때, 함수가 제자리에서 고친 뒤 답으로 출력하는 인자 */
  output_param: string | null;
}

export const MAX_PARAMS = 10;

const SCALARS = ["int", "long", "double", "bool", "char", "string"] as const;

/** 자료형 고르기 칸의 묶음. 값은 백엔드가 받는 자료형 이름 그대로다. */
export const TYPE_GROUPS: { label: string; types: string[] }[] = [
  { label: "값", types: [...SCALARS] },
  { label: "배열", types: SCALARS.map((t) => `${t}[]`) },
  { label: "2차원 배열", types: SCALARS.map((t) => `${t}[][]`) },
  { label: "리스트 (Java는 List, 다른 언어는 배열)", types: SCALARS.map((t) => `list<${t}>`) },
  { label: "2차원 리스트", types: SCALARS.map((t) => `list<list<${t}>>`) },
  { label: "노드", types: ["ListNode", "TreeNode"] },
];

const KNOWN_TYPES = new Set(TYPE_GROUPS.flatMap((group) => group.types));

export const isKnownType = (type: string) => KNOWN_TYPES.has(type);

/** 함수가 제자리에서 고칠 수 있는 자료형: 문자열이 아닌 배열·리스트, ListNode, TreeNode */
export function canModifyInPlace(type: string): boolean {
  if (type === "ListNode" || type === "TreeNode") return true;
  const isArray = type.endsWith("[]") || type.startsWith("list<");
  return isArray && !/\bstring\b/.test(type);
}

export const emptySignature = (): Signature => ({
  function: "",
  params: [{ name: "", type: "int" }],
  returns: "int",
  output_param: null,
});

/** 제자리에서 고친 뒤 출력할 수 있는 인자 이름들 */
export function outputCandidates(signature: Signature): string[] {
  return signature.params.filter((p) => p.name.trim() && canModifyInPlace(p.type)).map((p) => p.name.trim());
}

/** 저장하거나 백엔드에 보낼 모양. 이름의 앞뒤 공백을 지우고, void가 아니면 output_param을 비운다. */
export function normalizeSignature(signature: Signature): Signature {
  return {
    function: signature.function.trim(),
    params: signature.params.map((p) => ({ name: p.name.trim(), type: p.type })),
    returns: signature.returns,
    output_param: signature.returns === "void" ? signature.output_param?.trim() || null : null,
  };
}

/**
 * DB에서 읽은 값을 화면의 모양으로. 시그니처가 아니면 null.
 * 화면의 고르기 칸에 없는 자료형("int [ ]"처럼 띄어 쓴 것)도 그대로 두고, 백엔드가 검사한다.
 */
export function parseStoredSignature(raw: unknown): Signature | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.function !== "string" || typeof value.returns !== "string" || !Array.isArray(value.params)) {
    return null;
  }
  const params: SignatureParam[] = [];
  for (const item of value.params) {
    if (typeof item !== "object" || item === null) return null;
    const { name, type } = item as Record<string, unknown>;
    if (typeof name !== "string" || typeof type !== "string") return null;
    params.push({ name, type });
  }
  return {
    function: value.function,
    params,
    returns: value.returns,
    output_param: typeof value.output_param === "string" ? value.output_param : null,
  };
}

/** 사람에게 보여 줄 한 줄: twoSum(nums: int[], target: int) → int[] */
export function signatureLine(signature: Signature): string {
  const params = signature.params.map((p) => `${p.name}: ${p.type}`).join(", ");
  const returns = signature.returns === "void" && signature.output_param
    ? `void (${signature.output_param}를 제자리에서 고침)`
    : signature.returns;
  return `${signature.function}(${params}) → ${returns}`;
}

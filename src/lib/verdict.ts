// 채점 서버가 돌려주는 상태 문자열을 화면에 쓰는 말과 채점 표시로 바꾼다.
export type VerdictKind = "correct" | "wrong" | "waiting";

const LABELS: Record<string, string> = {
  Accepted: "정답",
  "Wrong Answer": "오답",
  "Time Limit Exceeded": "시간 초과",
  "Runtime Error": "런타임 오류",
  "Compile Error": "컴파일 오류",
  "System Error": "시스템 오류",
  Pending: "대기 중",
  Running: "채점 중",
  Unknown: "확인 필요",
};

export const verdictLabel = (status: string) => LABELS[status] ?? status;

export const isJudging = (status: string) =>
  status === "Pending" || status === "Running";

export const verdictKind = (status: string): VerdictKind => {
  if (status === "Accepted") return "correct";
  if (isJudging(status) || status === "Unknown") return "waiting";
  return "wrong";
};

// 판정 밑에 덧붙이는 한 줄. 다음에 할 일이 분명한 경우에만 둔다.
const ADVICE: Record<string, string> = {
  "Compile Error": "‘예제 실행’을 누르면 컴파일러 메시지를 볼 수 있습니다.",
  "System Error": "채점 서버 문제입니다. 잠시 후 다시 제출해 주세요.",
  Unknown: "결과가 늦어지고 있습니다. ‘내 제출’에서 확인해 주세요.",
};

export const verdictAdvice = (status: string) => ADVICE[status] ?? "";

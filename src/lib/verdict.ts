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
};

export const verdictLabel = (status: string) => LABELS[status] ?? status;

export const isJudging = (status: string) =>
  status === "Pending" || status === "Running";

export const verdictKind = (status: string): VerdictKind => {
  if (status === "Accepted") return "correct";
  if (isJudging(status)) return "waiting";
  return "wrong";
};

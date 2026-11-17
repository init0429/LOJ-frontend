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

// 판정이 나온 뒤 무엇을 하면 되는지 한 문장으로 알려 준다.
const ADVICE: Record<string, string> = {
  Accepted: "숨겨진 테스트를 모두 통과했습니다.",
  "Wrong Answer": "출력이 정답과 다른 테스트가 있습니다. 예제에 없는 입력도 떠올려 보세요.",
  "Time Limit Exceeded": "시간 제한 안에 끝나지 않은 테스트가 있습니다. 더 빠른 방법이 필요합니다.",
  "Runtime Error": "실행 중에 오류로 멈춘 테스트가 있습니다. 배열 범위와 0으로 나누기를 확인해 보세요.",
  "Compile Error": "코드가 컴파일되지 않았습니다. ‘예제 실행’을 누르면 컴파일러 메시지를 볼 수 있습니다.",
  "System Error": "채점 서버에 문제가 생겨 채점하지 못했습니다. 잠시 후 다시 제출해 주세요.",
  Pending: "채점 순서를 기다리고 있습니다.",
  Running: "채점하고 있습니다. 결과가 나오면 여기에 표시됩니다.",
};

export const verdictAdvice = (status: string) => ADVICE[status] ?? "";

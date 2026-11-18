import OutputComparison from "@/components/OutputComparison";
import Verdict from "@/components/Verdict";
import type { SubmissionFeedback } from "@/lib/types";
import { verdictAdvice, verdictLabel } from "@/lib/verdict";

// 숨겨진 테스트에서 틀렸을 때. 입력을 보여 줄 수 없으니 흔히 놓치는 곳을 짚어 준다.
const HIDDEN_TEST_HINTS: Record<string, string> = {
  "Wrong Answer": "가장 작은 입력과 가장 큰 입력, 같은 값이 반복되는 경우처럼 예제에 없는 경우를 확인해 보세요.",
  "Time Limit Exceeded": "입력이 가장 클 때도 제한 시간 안에 끝나는지 계산해 보세요.",
  "Runtime Error": "배열 범위, 0으로 나누기, 너무 깊은 재귀가 없는지 확인해 보세요.",
};

/** ‘제출’의 결과. 채점 설명이 있으면 몇 번째 테스트에서 틀렸는지도 보여 준다. */
export default function SubmissionResult({
  submitting,
  submitted,
  status,
  feedback,
  error,
}: {
  submitting: boolean;
  /** 이번 화면에서 제출한 적이 있는지 */
  submitted: boolean;
  status: string;
  /** 판정이 나온 뒤 읽은 채점 설명. 아직 없거나 읽지 못하면 null */
  feedback: SubmissionFeedback | null;
  error: string | null;
}) {
  if (error) {
    return <p role="alert" className="notice-error">{error}</p>;
  }
  if (submitting) {
    return <p role="status" className="notice">제출 중…</p>;
  }
  if (!submitted) {
    return <p className="notice">숨겨진 테스트까지 채점합니다.</p>;
  }

  const compilerMessage = status === "Compile Error" ? feedback?.message : undefined;
  // 컴파일 메시지를 바로 보여 주면 ‘예제 실행에서 보라’는 안내는 필요 없다.
  const advice = compilerMessage ? "" : verdictAdvice(status);
  // 시스템 오류는 코드 탓이 아니므로 몇 번째 테스트였는지는 알릴 필요가 없다.
  const failed = status !== "Accepted" && status !== "System Error" ? feedback?.failed_test : undefined;

  return (
    <div>
      <p role="status" className="flex flex-wrap items-baseline gap-x-3">
        <Verdict status={status} size="xl" />
        {feedback && feedback.total > 0 && status !== "Compile Error" && (
          <span className="text-sm text-muted tabular-nums">
            테스트 {feedback.total}개 중 {feedback.passed}개 통과
          </span>
        )}
      </p>
      {advice && <p className="mt-1 text-sm text-muted">{advice}</p>}
      {compilerMessage && <pre className="code-box mt-3 max-h-64 overflow-auto">{compilerMessage}</pre>}

      {failed !== undefined && feedback?.example && (
        <div className="mt-4">
          <p className="mb-3 text-sm">
            <span className="font-semibold">예제 {failed}</span>에서 {verdictLabel(status)}
          </p>
          <OutputComparison status={status} {...feedback.example} />
        </div>
      )}
      {failed !== undefined && !feedback?.example && (
        <div className="mt-4 text-sm">
          <p>
            <span className="font-semibold">{failed}번째 테스트</span>에서 {verdictLabel(status)}
          </p>
          <p className="mt-1 text-muted">
            숨겨진 테스트라 입력과 출력은 보여 드리지 않습니다. {HIDDEN_TEST_HINTS[status] ?? ""}
          </p>
        </div>
      )}
    </div>
  );
}

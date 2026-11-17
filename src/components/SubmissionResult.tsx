import Verdict from "@/components/Verdict";
import { isJudging, verdictAdvice } from "@/lib/verdict";

/** ‘제출’의 결과. 판정이 나오면 채점 표시가 한 번 그려진다. */
export default function SubmissionResult({
  submitting,
  submitted,
  status,
  error,
}: {
  submitting: boolean;
  /** 이번 화면에서 제출한 적이 있는지 */
  submitted: boolean;
  status: string;
  error: string | null;
}) {
  if (error) {
    return <p role="alert" className="notice-error">{error}</p>;
  }
  if (submitting) {
    return <p role="status" className="notice">제출하는 중…</p>;
  }
  if (!submitted) {
    return (
      <p className="notice max-w-[40em]">
        ‘제출’을 누르면 숨겨진 테스트까지 채점합니다.
      </p>
    );
  }
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-8 gap-y-3">
      <Verdict status={status} size="lg" draw={!isJudging(status)} />
      <p className="max-w-[30em] text-pencil">{verdictAdvice(status)}</p>
    </div>
  );
}

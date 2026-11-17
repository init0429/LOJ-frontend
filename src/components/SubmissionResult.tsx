import Verdict from "@/components/Verdict";
import { verdictAdvice } from "@/lib/verdict";

/** ‘제출’의 결과. */
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
    return <p role="status" className="notice">제출 중…</p>;
  }
  if (!submitted) {
    return <p className="notice">숨겨진 테스트까지 채점합니다.</p>;
  }
  const advice = verdictAdvice(status);
  return (
    <div role="status">
      <Verdict status={status} size="lg" />
      {advice && <p className="mt-1 text-sm text-muted">{advice}</p>}
    </div>
  );
}

import GradeMark from "@/components/GradeMark";
import Verdict from "@/components/Verdict";
import { verdictKind, verdictLabel } from "@/lib/verdict";
import type { TestResult } from "@/lib/types";

/** ‘예제 실행’의 결과. 틀린 예제는 입력과 두 출력을 나란히 보여 준다. */
export default function TestRunResult({
  running,
  result,
  error,
}: {
  running: boolean;
  result: TestResult | null;
  error: string | null;
}) {
  if (running) {
    return <p role="status" className="notice">예제를 실행하는 중…</p>;
  }
  if (error) {
    return <p role="alert" className="notice-error">{error}</p>;
  }
  if (!result) {
    return (
      <p className="notice max-w-[40em]">
        ‘예제 실행’을 누르면 문제에 나온 예제로 코드를 돌려 봅니다. 숨겨진 테스트는 제출해야 채점됩니다.
      </p>
    );
  }

  const cases = result.test_cases ?? [];
  return (
    <div role="status">
      <Verdict status={result.status} draw />
      {result.message && <pre className="code-box mt-3 max-h-64 overflow-auto text-[13px]">{result.message}</pre>}
      <ol className="mt-4 space-y-5">
        {cases.map((testCase, index) => (
          <li key={index}>
            <p className="flex items-center gap-2 font-bold">
              <GradeMark kind={verdictKind(testCase.status)} className="h-5 w-5 flex-none" />
              예제 {index + 1}
              <span className="font-medium text-pencil">{verdictLabel(testCase.status)}</span>
            </p>
            {testCase.status !== "Accepted" && (
              <dl className="mt-2 grid gap-3 md:grid-cols-3">
                {[
                  ["입력", testCase.input],
                  ["기대한 출력", testCase.expected],
                  ["내 출력", testCase.actual],
                ].map(([name, value]) => (
                  <div key={name} className="min-w-0">
                    <dt className="text-sm font-bold text-print-ink">{name}</dt>
                    <dd>
                      <pre className="code-box mt-1 max-h-48 overflow-auto text-[13px]">
                        {value.trim() || <span className="text-pencil">(출력 없음)</span>}
                      </pre>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

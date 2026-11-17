import Verdict from "@/components/Verdict";
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
    return <p role="status" className="notice">실행 중…</p>;
  }
  if (error) {
    return <p role="alert" className="notice-error">{error}</p>;
  }
  if (!result) {
    return <p className="notice">예제 입력으로 코드를 실행합니다.</p>;
  }

  const cases = result.test_cases ?? [];
  return (
    <div role="status">
      <Verdict status={result.status} />
      {result.message && <pre className="code-box mt-3 max-h-64 overflow-auto">{result.message}</pre>}
      <ol className="mt-3 space-y-4">
        {cases.map((testCase, index) => (
          <li key={index}>
            <p className="flex items-center gap-2 text-sm">
              <span className="font-semibold">예제 {index + 1}</span>
              <Verdict status={testCase.status} size="sm" />
            </p>
            {testCase.status !== "Accepted" && (
              <dl className="mt-2 grid gap-3 md:grid-cols-3">
                {[
                  ["입력", testCase.input],
                  ["기대한 출력", testCase.expected],
                  ["내 출력", testCase.actual],
                ].map(([name, value]) => (
                  <div key={name} className="min-w-0">
                    <dt className="text-sm text-muted">{name}</dt>
                    <dd>
                      <pre className="code-box mt-1 max-h-48 overflow-auto">
                        {value.trim() || <span className="text-muted">(출력 없음)</span>}
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

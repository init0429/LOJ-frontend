"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import OutputComparison from "@/components/OutputComparison";
import Verdict from "@/components/Verdict";
import type { TestResult } from "@/lib/types";
import { verdictLabel } from "@/lib/verdict";

/** ‘예제 실행’의 결과. 예제마다 탭을 두고, 처음엔 처음 틀린 예제를 펼쳐 둔다. */
export default function TestRunResult({
  running,
  result,
  error,
}: {
  running: boolean;
  result: TestResult | null;
  error: string | null;
}) {
  // 고른 탭은 그 결과에만 쓴다. 다시 실행하면 새 결과의 처음 틀린 예제로 돌아간다.
  const [picked, setPicked] = useState<{ result: TestResult; index: number } | null>(null);

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
  const total = Math.max(result.total ?? 0, cases.length);
  const passed = cases.filter((testCase) => testCase.status === "Accepted").length;
  const firstFailed = cases.findIndex((testCase) => testCase.status !== "Accepted");
  const selected = picked?.result === result ? picked.index : Math.max(firstFailed, 0);

  return (
    <div>
      <p role="status" className="flex flex-wrap items-baseline gap-x-3">
        <Verdict status={result.status} size="lg" />
        {cases.length > 0 && (
          <span className="text-sm text-muted tabular-nums">예제 {total}개 중 {passed}개 통과</span>
        )}
      </p>
      {cases.length > 0 && cases.length < total && (
        <p className="mt-1 text-sm text-muted">
          시간이 모자라 남은 예제 {total - cases.length}개를 실행하지 못했습니다.
        </p>
      )}
      {result.message && <pre className="code-box mt-3 max-h-64 overflow-auto">{result.message}</pre>}

      {cases.length > 0 && (
        <>
          <div role="group" aria-label="예제 고르기" className="mt-3 flex flex-wrap gap-1 border-b border-line">
            {cases.map((testCase, index) => {
              const ok = testCase.status === "Accepted";
              const Icon = ok ? Check : X;
              return (
                <button
                  key={index}
                  type="button"
                  className="tab tab-sm gap-1.5"
                  aria-pressed={index === selected}
                  onClick={() => setPicked({ result, index })}
                >
                  <Icon size={14} strokeWidth={2.5} aria-hidden="true" className={ok ? "text-ok" : "text-bad"} />
                  예제 {index + 1}
                  <span className="sr-only">: {verdictLabel(testCase.status)}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <p className="mb-2 text-sm">
              <span className="font-semibold">예제 {selected + 1}</span>{" "}
              <Verdict status={cases[selected].status} size="sm" />
            </p>
            <OutputComparison {...cases[selected]} />
          </div>
        </>
      )}
    </div>
  );
}

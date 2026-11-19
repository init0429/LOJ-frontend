import type { ReactNode } from "react";
import { compareOutputs, describeDifference, outputLines, type OutputLine } from "@/lib/output-diff";
import type { CaseDisplay } from "@/lib/types";

// 오답이 아닌 실패는 출력을 비교해도 소용이 없어서 무슨 일이 있었는지만 알린다.
const STATUS_HINTS: Record<string, string> = {
  "Time Limit Exceeded": "제한 시간 안에 끝나지 않았습니다. 무한 반복이 없는지, 더 빠른 방법이 있는지 확인해 보세요.",
  "Runtime Error": "실행 중에 프로그램이 멈췄습니다. 내 출력 칸에 오류 메시지가 함께 나옵니다.",
  "System Error": "채점 서버 문제입니다. 잠시 후 다시 실행해 주세요.",
};

// 채점기가 런타임 오류 대신 출력 칸에 적어 보내는 이유
const LIMIT_HINTS: Record<string, string> = {
  "Memory limit exceeded": "메모리 제한을 넘었습니다.",
  "Output limit exceeded": "출력이 너무 많습니다. 디버그용 출력이 남아 있지 않은지 확인해 보세요.",
};

/**
 * 테스트 하나의 입력, 내 출력, 기대한 출력. 오답이면 다른 줄을 표시한다.
 * 함수 구현으로 실행했으면 인자와 반환값 표기(display)로 보여 준다. 바꾸지 못한 칸은 원문 그대로.
 */
export default function OutputComparison({
  status,
  display,
  ...raw
}: {
  status: string;
  input: string;
  expected: string;
  actual: string;
  display?: CaseDisplay;
}) {
  const input = display?.input ?? raw.input;
  // 두 출력은 함께 바꿔야 비교가 맞는다. 한쪽이라도 못 바꿨으면 둘 다 원문으로 보여 준다.
  const viewed = display?.expected != null && display.actual != null;
  const expected = viewed ? display.expected! : raw.expected;
  const actual = viewed ? display.actual! : raw.actual;
  const wrong = status === "Wrong Answer";
  const diff = compareOutputs(actual, expected);
  const hint = wrong
    ? describeDifference(diff)
    : LIMIT_HINTS[actual.trim()] ?? STATUS_HINTS[status] ?? "";

  return (
    <div className="space-y-3">
      {hint && <p className="text-sm notice-error">{hint}</p>}
      <Field label="입력">
        <Plain text={input} empty="(입력 없음)" />
      </Field>
      <Field label="내 출력">
        {wrong ? (
          <Lines lines={diff.actual} empty="(출력 없음)" />
        ) : (
          <Plain text={actual} empty={status === "Time Limit Exceeded" ? "(시간 초과로 출력 없음)" : "(출력 없음)"} />
        )}
      </Field>
      <Field label="기대한 출력">
        {wrong ? <Lines lines={diff.expected} empty="(출력 없음)" /> : <Plain text={expected} empty="(출력 없음)" />}
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}

function Plain({ text, empty }: { text: string; empty: string }) {
  const lines = outputLines(text);
  return (
    <pre className="code-box mt-1 max-h-48 overflow-auto">
      {lines.length ? lines.join("\n") : <span className="text-muted">{empty}</span>}
    </pre>
  );
}

/** 줄 번호와 함께 보여 주고, 상대편과 다른 줄은 빨간 바탕으로 칠한다. */
function Lines({ lines, empty }: { lines: OutputLine[]; empty: string }) {
  if (lines.length === 0) {
    return (
      <pre className="code-box mt-1">
        <span className="text-muted">{empty}</span>
      </pre>
    );
  }
  return (
    <pre className="code-box mt-1 max-h-48 overflow-auto px-0!">
      {lines.map((line, index) => (
        <span key={index} className={`flex ${line.same ? "" : "bg-bad/15"}`}>
          <span
            aria-hidden="true"
            className={`w-9 flex-none pr-2 text-right tabular-nums select-none ${line.same ? "text-muted" : "text-bad"}`}
          >
            {index + 1}
          </span>
          <span className="min-w-0 flex-1 pr-3">
            {line.text || " "}
            {!line.same && <span className="sr-only"> (다른 줄)</span>}
          </span>
        </span>
      ))}
    </pre>
  );
}

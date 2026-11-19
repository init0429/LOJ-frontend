"use client";

import { useId, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { CaseCheck } from "@/hooks/useSignaturePreview";
import { errorMessage } from "@/lib/errors";
import { convertExample } from "@/lib/function-api";
import type { Signature } from "@/lib/signature";

/** 테스트 카드 아래: 이 테스트를 함수 구현으로 보면 어떤 인자와 답인지, 맞힐 수 없는 모양이면 그 이유 */
export function FunctionCheck({
  check,
  loading,
  onUseNormalized,
}: {
  check: CaseCheck | undefined;
  loading: boolean;
  /** 답을 드라이버가 출력하는 모양으로 바꾼다 */
  onUseNormalized: (output: string) => void;
}) {
  if (check === "skipped") {
    return <p className="text-[13px] text-muted">함수 구현: 너무 커서 확인하지 않았습니다.</p>;
  }
  if (!check) {
    return loading ? <p className="text-[13px] text-muted">함수 구현: 확인하는 중…</p> : null;
  }
  if (check.error) {
    return (
      <div className="text-[13px]">
        <p className="notice-error">함수 구현: {check.error}</p>
        {check.normalized_output !== null && (
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-muted">드라이버가 출력하는 답:</span>
            <code className="rounded bg-fill px-1.5 py-0.5 font-mono">{check.normalized_output}</code>
            <button type="button" onClick={() => onUseNormalized(check.normalized_output!)} className="btn btn-sm btn-line">
              이 모양으로 바꾸기
            </button>
          </p>
        )}
      </div>
    );
  }
  return (
    <p className="break-all font-mono text-[13px] text-muted">
      <span className="font-sans">함수 구현: </span>
      {check.input || "(인자 없음)"} <span className="font-sans">→</span> {check.output}
    </p>
  );
}

/**
 * LeetCode식 표기로 적은 예제를 저장할 입력·출력 텍스트로 바꿔 채운다.
 *   입력: nums = [2,7,11,15], target = 9   (또는 값마다 한 줄)
 *   출력: [0,1]
 */
export function ExampleNotationHelper({
  signature,
  disabled,
  onFill,
}: {
  signature: Signature;
  /** 시그니처를 아직 쓸 수 없을 때 */
  disabled: boolean;
  onFill: (texts: { input: string; output: string | null }) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} disabled={disabled} className="btn btn-sm btn-line">
        LeetCode식 표기로 채우기
      </button>
    );
  }

  const fill = async () => {
    setBusy(true);
    setError(null);
    try {
      onFill(await convertExample(signature, input, output));
      setOpen(false);
      setInput("");
      setOutput("");
    } catch (err) {
      setError(errorMessage(err, "바꾸지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-line p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${id}-in`} className="block text-sm text-muted">
          입력
          <textarea
            id={`${id}-in`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="nums = [2,7,11,15], target = 9"
            spellCheck={false}
            className="input input-code mt-1 font-normal"
          />
        </label>
        <label htmlFor={`${id}-out`} className="block text-sm text-muted">
          출력<span className="field-hint">비우면 입력만 바꿉니다</span>
          <textarea
            id={`${id}-out`}
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            rows={2}
            placeholder="[0,1]"
            spellCheck={false}
            className="input input-code mt-1 font-normal"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void fill()} disabled={busy || !input.trim()} className="btn btn-sm btn-fill">
          {busy && <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />}
          바꿔서 채우기
        </button>
        <button type="button" onClick={() => setOpen(false)} disabled={busy} className="btn btn-sm btn-line">닫기</button>
        {error && <p role="alert" className="notice-error text-sm">{error}</p>}
      </div>
      <p className="mt-2 text-[13px] text-muted">
        위의 입력·출력 칸을 바꾼 텍스트로 덮어씁니다. 전체 프로그램으로 푸는 사람은 그 텍스트를 표준 입력으로 읽습니다.
      </p>
    </div>
  );
}

import { Check } from "lucide-react";

/** 문제 번호. 맞힌 문제는 옆에 초록 체크가 붙는다. */
export default function ProblemNumber({
  id,
  solved = false,
}: {
  /** 문제 번호. 대회에서는 A, B, C 같은 순서 글자를 넘긴다. */
  id: number | string;
  solved?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      {id}
      {solved && (
        <>
          <Check size={15} strokeWidth={3} className="text-ok" aria-hidden="true" />
          <span className="sr-only">(맞힌 문제)</span>
        </>
      )}
    </span>
  );
}

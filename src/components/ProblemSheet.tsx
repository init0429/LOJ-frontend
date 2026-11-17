import Difficulty from "@/components/Difficulty";
import ProblemContent from "@/components/ProblemContent";
import ProblemNumber from "@/components/ProblemNumber";
import { formatSeconds } from "@/lib/format";
import type { Problem, TestCase } from "@/lib/types";

/** 문제지 한 장: 번호, 제목, 제한, 본문, 입출력 설명, 예제. */
export default function ProblemSheet({
  problem,
  examples,
  number,
  mark = null,
  drawMark = false,
}: {
  problem: Problem;
  examples: TestCase[];
  /** 번호 자리에 보여 줄 값. 생략하면 문제 번호. */
  number?: number | string;
  mark?: "correct" | "wrong" | null;
  drawMark?: boolean;
}) {
  return (
    <article>
      <header className="flex items-start gap-4">
        <ProblemNumber id={number ?? problem.id} size="lg" mark={mark} draw={drawMark} />
        <div className="min-w-0 pt-1">
          <h1 className="text-[26px] font-extrabold leading-snug tracking-[-0.01em]">{problem.title}</h1>
          <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex items-center gap-2">
              <dt className="font-bold text-print-ink">난이도</dt>
              <dd><Difficulty value={problem.difficulty} showLabel /></dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-bold text-print-ink">시간 제한</dt>
              <dd>{formatSeconds(problem.time_limit_ms)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-bold text-print-ink">메모리 제한</dt>
              <dd>{problem.memory_limit_mb}MB</dd>
            </div>
          </dl>
        </div>
      </header>

      <ProblemContent content={problem.description} className="mt-7" />

      {problem.input_description && (
        <section className="mt-9">
          <h2 className="section-title">입력</h2>
          <ProblemContent content={problem.input_description} className="mt-2" />
        </section>
      )}

      {problem.output_description && (
        <section className="mt-9">
          <h2 className="section-title">출력</h2>
          <ProblemContent content={problem.output_description} className="mt-2" />
        </section>
      )}

      {examples.length > 0 && (
        <section className="mt-9">
          <h2 className="section-title">예제</h2>
          {examples.map((example, index) => (
            <div key={example.id} className="mt-3 grid gap-3 sm:grid-cols-2">
              <figure className="min-w-0">
                <figcaption className="text-sm font-bold text-print-ink">입력 {index + 1}</figcaption>
                <pre className="code-box mt-1">{example.input_data}</pre>
              </figure>
              <figure className="min-w-0">
                <figcaption className="text-sm font-bold text-print-ink">출력 {index + 1}</figcaption>
                <pre className="code-box mt-1">{example.expected_output}</pre>
              </figure>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

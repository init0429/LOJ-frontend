import { CircleCheck, Clock, MemoryStick } from "lucide-react";
import ProblemLevel from "@/components/ProblemLevel";
import ProblemContent from "@/components/ProblemContent";
import { formatSeconds } from "@/lib/format";
import type { Problem, TestCase } from "@/lib/types";

/** 문제 한 개: 번호, 제목, 난이도와 제한 꼬리표, 본문, 입출력 설명, 예제. */
export default function ProblemSheet({
  problem,
  examples,
  number,
  solved = false,
}: {
  problem: Problem;
  examples: TestCase[];
  /** 번호 자리에 보여 줄 값. 생략하면 문제 번호. */
  number?: number | string;
  solved?: boolean;
}) {
  return (
    <article>
      {/* 번호는 제목에 붙이지 않고 위에 따로 적는다. 대회에서는 "A번"처럼 순서 글자가 온다. */}
      <p className="text-sm font-medium text-muted tabular-nums">{number ?? problem.id}번</p>
      <h1 className="mt-0.5 text-[22px] leading-snug font-semibold">{problem.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ProblemLevel tier={problem.solvedac_tier} difficulty={problem.difficulty} chip />
        <span className="chip">
          <Clock size={12} aria-hidden="true" />
          시간 {formatSeconds(problem.time_limit_ms)}
        </span>
        <span className="chip">
          <MemoryStick size={12} aria-hidden="true" />
          메모리 {problem.memory_limit_mb}MB
        </span>
        {solved && (
          <span className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-ok">
            해결함
            <CircleCheck size={16} aria-hidden="true" />
          </span>
        )}
      </div>

      <ProblemContent content={problem.description} className="mt-6" />

      {problem.input_description && (
        <section className="mt-8">
          <h2 className="section-title">입력</h2>
          <ProblemContent content={problem.input_description} className="mt-2" />
        </section>
      )}

      {problem.output_description && (
        <section className="mt-8">
          <h2 className="section-title">출력</h2>
          <ProblemContent content={problem.output_description} className="mt-2" />
        </section>
      )}

      {examples.map((example, index) => (
        <section key={example.id} className="mt-8">
          <h2 className="font-semibold">예제 {index + 1}</h2>
          <dl className="mt-2 border-l-2 border-line-strong pl-4">
            <dt className="text-sm font-semibold">입력</dt>
            <dd>
              <pre className="mt-1 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{example.input_data}</pre>
            </dd>
            <dt className="mt-3 text-sm font-semibold">출력</dt>
            <dd>
              <pre className="mt-1 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{example.expected_output}</pre>
            </dd>
          </dl>
        </section>
      ))}
    </article>
  );
}

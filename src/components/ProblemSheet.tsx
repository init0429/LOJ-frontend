import { CircleCheck, Clock, MemoryStick } from "lucide-react";
import ProblemLevel from "@/components/ProblemLevel";
import ProblemContent from "@/components/ProblemContent";
import ProblemTags from "@/components/ProblemTags";
import { formatSeconds } from "@/lib/format";
import type { Problem, TestCase } from "@/lib/types";

/** 문제 한 개: 번호, 제목, 난이도와 제한 꼬리표, 본문, 입출력 설명, 예제, (원하면) 알고리즘 분류. */
export default function ProblemSheet({
  problem,
  examples,
  number,
  solved = false,
  withTags = false,
  exampleViews,
}: {
  problem: Problem;
  examples: TestCase[];
  /** 함수 구현으로 볼 때 예제를 인자 표기로 보여 준다(테스트케이스 번호 → 표기). 바꾸지 못한 칸은 원문 */
  exampleViews?: Map<number, { input: string | null; output: string | null }>;
  /** 번호 자리에 보여 줄 값. 생략하면 문제 번호. */
  number?: number | string;
  solved?: boolean;
  /** 맨 아래에 알고리즘 분류를 붙인다. 대회 중에는 힌트가 되므로 넘기지 않는다. */
  withTags?: boolean;
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

      {examples.map((example, index) => {
        const view = exampleViews?.get(example.id);
        return (
          <section key={example.id} className="mt-8">
            <h2 className="font-semibold">예제 {index + 1}</h2>
            <dl className="mt-2 border-l-2 border-line-strong pl-4">
              <dt className="text-sm font-semibold">입력</dt>
              <dd>
                <pre className="mt-1 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{view?.input ?? example.input_data}</pre>
              </dd>
              <dt className="mt-3 text-sm font-semibold">출력</dt>
              <dd>
                <pre className="mt-1 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-muted">{view?.output ?? example.expected_output}</pre>
              </dd>
            </dl>
          </section>
        );
      })}

      {withTags && <ProblemTags problemId={problem.id} />}
    </article>
  );
}

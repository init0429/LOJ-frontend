import Difficulty from "@/components/Difficulty";
import ProblemContent from "@/components/ProblemContent";
import ProblemNumber from "@/components/ProblemNumber";
import { formatSeconds } from "@/lib/format";
import type { Problem, TestCase } from "@/lib/types";

/** 문제 한 개: 번호와 제목, 제한, 본문, 입출력 설명, 예제. */
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
      <h1 className="page-title">
        <span className="mr-2 text-muted"><ProblemNumber id={number ?? problem.id} solved={solved} /></span>
        {problem.title}
      </h1>
      <table className="mt-3 text-sm">
        <tbody>
          <tr>
            <th className="pr-4 text-left font-normal text-muted">난이도</th>
            <td><Difficulty value={problem.difficulty} /></td>
          </tr>
          <tr>
            <th className="pr-4 text-left font-normal text-muted">시간 제한</th>
            <td>{formatSeconds(problem.time_limit_ms)}</td>
          </tr>
          <tr>
            <th className="pr-4 text-left font-normal text-muted">메모리 제한</th>
            <td>{problem.memory_limit_mb}MB</td>
          </tr>
        </tbody>
      </table>

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

      {examples.length > 0 && (
        <section className="mt-8">
          <h2 className="section-title">예제</h2>
          {examples.map((example, index) => (
            <div key={example.id} className="mt-3 grid gap-3 sm:grid-cols-2">
              <figure className="min-w-0">
                <figcaption className="text-sm text-muted">입력 {index + 1}</figcaption>
                <pre className="code-box mt-1">{example.input_data}</pre>
              </figure>
              <figure className="min-w-0">
                <figcaption className="text-sm text-muted">출력 {index + 1}</figcaption>
                <pre className="code-box mt-1">{example.expected_output}</pre>
              </figure>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}

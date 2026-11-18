"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, EyeOff, RefreshCw } from "lucide-react";
import ProblemLevel from "@/components/ProblemLevel";
import TierBadge from "@/components/TierBadge";
import { formatDateTime } from "@/lib/format";
import type { NamedTag, Recommendations } from "@/lib/recommend-api";
import { tierName } from "@/lib/solvedac-tier";

/** 추천 결과 한 벌: 기준, 약한 유형, LOJ 문제, 백준 문제 */
export default function RecommendationView({
  result,
  onRefresh,
  refreshing = false,
}: {
  result: Recommendations;
  /** 백준 문제를 새로 고른다. 없으면 단추를 숨긴다. */
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { basis } = result;
  return (
    <>
      <p className="page-lead">{basisText(result)}</p>

      {!basis.linked && (
        <div className="box mt-6 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm">solved.ac를 연결하면 백준에서 푼 기록까지 보고 맞춤 추천을 받을 수 있어요.</p>
          <Link href="/settings" className="btn btn-sm btn-line">solved.ac 연결</Link>
        </div>
      )}

      {result.weak_tags.length > 0 && (
        <section className="mt-6" aria-labelledby="weak-title">
          <h2 id="weak-title" className="text-sm font-medium text-muted">연습하면 좋을 유형</h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {result.weak_tags.map((tag) => <li key={tag.key} className="chip text-fg">{tag.name}</li>)}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="loj-title">
        <h2 id="loj-title" className="section-title">{result.starter ? "처음이라면 이 문제부터" : "LOJ에서 풀기"}</h2>
        {result.loj.length === 0 ? (
          <p className="notice mt-3">지금 수준에 맞는 LOJ 문제를 다 풀었습니다. 아래 백준 문제나 문제 목록을 둘러보세요.</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.loj.map((problem) => (
              <li key={problem.id} className="box flex flex-col gap-2 px-4 py-3">
                <Link href={`/problems/${problem.id}`} className="font-medium hover:text-accent">
                  {problem.title}
                </Link>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-xs text-muted tabular-nums">{problem.id}번</span>
                  <ProblemLevel tier={problem.tier} difficulty={problem.difficulty} />
                  <SpoilerTags tags={problem.tags} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {result.boj.length > 0 && (
        <section className="mt-8" aria-labelledby="boj-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="boj-title" className="section-title">백준에서 더 풀기</h2>
            {onRefresh && (
              <button type="button" onClick={onRefresh} disabled={refreshing} className="btn btn-sm btn-line">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} aria-hidden="true" />
                다른 문제 보기
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">LOJ에서는 채점할 수 없어서 백준 문제 페이지로 갑니다. 이미 푼 문제는 뺐습니다.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.boj.map((problem) => (
              <li key={problem.problem_id} className="box flex flex-col gap-2 px-4 py-3">
                <a href={problem.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 font-medium hover:text-accent">
                  <span>
                    <span className="text-muted tabular-nums">BOJ {problem.problem_id}</span> {problem.title}
                  </span>
                  <ArrowUpRight size={15} className="mt-0.5 flex-none text-muted" aria-hidden="true" />
                  <span className="sr-only">(새 창에서 백준 열기)</span>
                </a>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <TierBadge tier={problem.tier} />
                  <SpoilerTags tags={problem.tags} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** 무엇을 기준으로 골랐는지 한 줄로 */
function basisText({ basis, starter }: Recommendations): string {
  if (basis.source === "solvedac") {
    const synced = basis.synced_at ? ` · ${formatDateTime(basis.synced_at)} 동기화` : "";
    return `solved.ac ${tierName(basis.tier)}${basis.handle ? ` (${basis.handle})` : ""} 기준${synced}`;
  }
  if (basis.source === "loj") return `LOJ에서 푼 문제로 어림한 ${tierName(basis.tier)} 기준`;
  if (starter) return "아직 푼 문제가 없어서 쉬운 문제부터 골랐습니다.";
  return "LOJ 제출 기록 기준";
}

/** 문제의 태그는 풀이 힌트가 되므로 눌러야 보인다. */
function SpoilerTags({ tags }: { tags: NamedTag[] }) {
  const [open, setOpen] = useState(false);
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-fill hover:text-fg"
      >
        {open ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
        {open ? "태그 숨기기" : "태그 보기"}
      </button>
      {open && tags.map((tag) => <span key={tag.key} className="chip h-6 px-2">{tag.name}</span>)}
    </div>
  );
}

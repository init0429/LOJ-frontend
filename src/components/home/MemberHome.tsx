"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Timer } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import ProblemLevel from "@/components/ProblemLevel";
import Verdict from "@/components/Verdict";
import { fetchAllRows } from "@/lib/fetch-all";
import { formatDateTime, formatUntil } from "@/lib/format";
import { activeContests, myRank, summarize, unsolvedAttempts, type ContestSummary, type MySubmission } from "@/lib/home";
import { LANGUAGE_LABELS } from "@/lib/languages";
import { PROFILE_EVENT } from "@/lib/profile";
import { getRecommendations, type Recommendations } from "@/lib/recommend-api";
import { supabase } from "@/lib/supabase";

interface ProblemSummary {
  id: number;
  title: string;
  difficulty: number | null;
  solvedac_tier?: number | null;
}

interface RecentSubmission {
  id: string;
  problem_id: number;
  status: string;
  language: string;
  created_at: string;
  mode?: string;
}

interface Overview {
  submissions: MySubmission[];
  recent: RecentSubmission[];
  attempts: ProblemSummary[];
  /** 최근 제출과 이어서 풀 문제의 제목 */
  titles: Map<number, string>;
  problemCount: number | null;
  rank: ReturnType<typeof myRank>;
  contests: ContestSummary[];
}

/** 로그인한 사람의 첫 화면: 내 기록, 이어서 풀 문제, 추천, 대회, 최근 제출 */
export default function MemberHome({ session }: { session: Session }) {
  const userId = session.user.id;
  const [name, setName] = useState<string | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendations | "error" | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadName = async () => {
      const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
      if (active) setName(data?.username ?? session.user.email?.split("@")[0] ?? null);
    };
    void loadName();
    window.addEventListener(PROFILE_EVENT, loadName);
    return () => {
      active = false;
      window.removeEventListener(PROFILE_EVENT, loadName);
    };
  }, [userId, session.user.email]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [all, recent, problems, board, contests] = await Promise.all([
        fetchAllRows<MySubmission>((from, to) =>
          supabase
            .from("submissions")
            .select("problem_id, status, created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .order("id")
            .range(from, to),
        ),
        // 운영 DB에는 submissions → problems 외래 키가 없어 problems(title)로 이어 읽을 수 없다. 제목은 아래에서 따로 읽는다.
        supabase
          .from("submissions")
          .select("id, problem_id, status, language, created_at, mode")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5)
          .returns<RecentSubmission[]>(),
        supabase.from("problems").select("id", { count: "exact", head: true }),
        supabase.from("leaderboard").select("user_id, rating").order("rating", { ascending: false }),
        supabase
          .from("contests")
          .select("id, title, start_time, end_time")
          .gt("end_time", new Date().toISOString())
          .order("start_time"),
      ]);
      if (!active) return;
      if (all.error || recent.error) {
        setLoadError(true);
        return;
      }

      const attemptIds = unsolvedAttempts(all.data);
      const recentRows = recent.data ?? [];
      const wanted = [...new Set([...attemptIds, ...recentRows.map((row) => row.problem_id)])];
      const byId = new Map<number, ProblemSummary>();
      if (wanted.length) {
        const { data } = await supabase
          .from("problems")
          .select("id, title, difficulty, solvedac_tier")
          .in("id", wanted);
        for (const row of (data ?? []) as ProblemSummary[]) byId.set(row.id, row);
      }
      if (!active) return;
      setOverview({
        submissions: all.data,
        recent: recentRows,
        // 지워졌거나 아직 공개되지 않은 문제는 이어서 풀 수 없으니 뺀다.
        attempts: attemptIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
        titles: new Map([...byId].map(([id, problem]) => [id, problem.title])),
        problemCount: problems.count ?? null,
        rank: board.error ? null : myRank(board.data ?? [], userId),
        contests: contests.data ?? [],
      });
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  // 추천은 백엔드가 solved.ac에 물어보느라 늦을 수 있어서 따로 받는다.
  useEffect(() => {
    let active = true;
    getRecommendations().then(
      (result) => active && setRecommendations(result),
      () => active && setRecommendations("error"),
    );
    return () => {
      active = false;
    };
  }, [userId]);

  if (loadError) {
    return (
      <div className="page">
        <p role="alert" className="notice-error">내 기록을 불러오지 못했습니다. 새로고침해 주세요.</p>
      </div>
    );
  }

  const stats = overview ? summarize(overview.submissions) : null;
  const upcoming = overview ? activeContests(overview.contests, now) : [];

  return (
    <div className="page">
      <h1 className="page-title">{name ? `${name}님, 반가워요` : "반가워요"}</h1>
      <p className="page-lead">오늘도 한 문제 풀어 볼까요?</p>

      <section aria-label="내 기록" className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="푼 문제" value={stats ? String(stats.solved) : null} sub={overview?.problemCount != null ? `/ ${overview.problemCount}` : undefined} />
        <Stat label="제출" value={stats ? String(stats.submissions) : null} />
        <Stat label="정답률" value={stats ? (stats.acceptance === null ? "–" : `${stats.acceptance}%`) : null} />
        <Stat
          label="순위"
          value={overview ? (overview.rank ? `${overview.rank.rank}위` : "–") : null}
          sub={overview?.rank ? `${overview.rank.rating}점` : undefined}
          href="/leaderboard"
        />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <Section title="이어서 풀기" more={{ href: "/problems", label: "문제 목록" }}>
            {!overview ? (
              <Loading />
            ) : overview.attempts.length === 0 ? (
              <p className="notice text-sm">
                {stats?.submissions ? "시도한 문제는 모두 맞혔어요. 새 문제를 골라 보세요." : "아직 제출한 문제가 없어요. 문제 목록에서 하나 골라 보세요."}
              </p>
            ) : (
              <ul className="box divide-y divide-line">
                {overview.attempts.map((problem) => (
                  <li key={problem.id}>
                    <Link href={`/problems/${problem.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fill">
                      <span className="w-10 flex-none text-sm text-muted tabular-nums">{problem.id}번</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{problem.title}</span>
                      <ProblemLevel tier={problem.solvedac_tier} difficulty={problem.difficulty} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="추천 문제" more={{ href: "/recommend", label: "추천 더 보기" }}>
            {recommendations === null ? (
              <Loading />
            ) : recommendations === "error" ? (
              <p className="notice text-sm">추천을 불러오지 못했어요. 추천 화면에서 다시 볼 수 있습니다.</p>
            ) : recommendations.loj.length === 0 ? (
              <p className="notice text-sm">지금 추천할 LOJ 문제가 없어요. 추천 화면에서 백준 문제를 볼 수 있습니다.</p>
            ) : (
              <ul className="box divide-y divide-line">
                {recommendations.loj.slice(0, 3).map((problem) => (
                  <li key={problem.id}>
                    <Link href={`/problems/${problem.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fill">
                      <span className="w-10 flex-none text-sm text-muted tabular-nums">{problem.id}번</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{problem.title}</span>
                      <ProblemLevel tier={problem.tier} difficulty={problem.difficulty} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="최근 제출">
            {!overview ? (
              <Loading />
            ) : overview.recent.length === 0 ? (
              <p className="notice text-sm">아직 제출한 적이 없어요.</p>
            ) : (
              <ul className="box divide-y divide-line">
                {overview.recent.map((sub) => (
                  <li key={sub.id}>
                    <Link href={`/problems/${sub.problem_id}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-3 hover:bg-fill">
                      <span className="w-20 flex-none"><Verdict status={sub.status} size="sm" /></span>
                      <span className="min-w-0 flex-1 truncate">
                        <span className="text-muted tabular-nums">{sub.problem_id}번</span> {overview.titles.get(sub.problem_id) ?? ""}
                      </span>
                      <span className="text-sm text-muted">
                        {LANGUAGE_LABELS[sub.language]?.replace(/ \(.*\)$/, "") ?? sub.language}
                        {sub.mode === "function" && " · 함수"}
                        {" · "}
                        {formatDateTime(sub.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <aside className="space-y-10">
          <Section title="대회" more={{ href: "/contests", label: "전체 대회" }}>
            {!overview ? (
              <Loading />
            ) : upcoming.length === 0 ? (
              <p className="notice text-sm">진행 중이거나 예정된 대회가 없어요.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((contest) => {
                  const started = new Date(contest.start_time).getTime() <= now;
                  return (
                    <li key={contest.id}>
                      <Link href={`/contests/${contest.id}`} className="box block px-4 py-3 hover:bg-fill">
                        <p className="font-medium">{contest.title}</p>
                        <p className={`mt-1 flex items-center gap-1.5 text-sm ${started ? "font-semibold text-ok" : "text-muted"}`}>
                          <Timer size={14} aria-hidden="true" />
                          {started
                            ? `진행 중 · ${formatUntil(new Date(contest.end_time).getTime() - now)} 끝남`
                            : `${formatUntil(new Date(contest.start_time).getTime() - now)} 시작 · ${formatDateTime(contest.start_time)}`}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          {recommendations && recommendations !== "error" && !recommendations.basis.linked && (
            <div className="box p-4">
              <p className="text-sm font-medium">solved.ac 연결하기</p>
              <p className="mt-1 text-sm text-muted">백준에서 푼 기록까지 보고 더 잘 맞는 문제를 추천받을 수 있어요.</p>
              <Link href="/settings/solvedac" className="btn btn-sm btn-line mt-3">연결하러 가기</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, href }: { label: string; value: string | null; sub?: string; href?: string }) {
  const body = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tabular-nums">{value ?? "…"}</span>
        {sub && <span className="text-sm text-muted tabular-nums">{sub}</span>}
      </p>
    </>
  );
  return href ? (
    <Link href={href} className="box block px-4 py-3 hover:bg-fill">{body}</Link>
  ) : (
    <div className="box px-4 py-3">{body}</div>
  );
}

function Section({
  title,
  more,
  children,
}: {
  title: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        {more && (
          <Link href={more.href} className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
            {more.label}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Loading() {
  return <p role="status" className="notice text-sm">불러오는 중…</p>;
}

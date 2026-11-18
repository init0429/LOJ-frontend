"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetch-all";
import Difficulty from "@/components/Difficulty";
import ProblemNumber from "@/components/ProblemNumber";

interface Problem {
  id: number;
  title: string;
  time_limit_ms: number;
  memory_limit_mb: number;
  difficulty: number | null; // 1~5. DB에 아직 값이 없는 문제는 null일 수 있음
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [stats, setStats] = useState<
    Record<number, { total: number; accepted: number }>
  >({});

  const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const [problemsRes, statsRes] = await Promise.all([
        supabase
          .from("problems")
          .select("id, title, time_limit_ms, memory_limit_mb, difficulty")
          .order("id", { ascending: true }),
        // 정답률은 전체 사용자 기준이다. 남의 제출은 RLS로 읽을 수 없으므로 DB 함수가
        // 문제별 개수만 세어 준다(backend/migrations/20261118_row_level_security.sql).
        fetchAllRows<{ problem_id: number; submissions: number; accepted: number }>((from, to) =>
          supabase.rpc("problem_stats").order("problem_id").range(from, to),
        ),
      ]);

      if (problemsRes.error) {
        console.error("문제 목록 로딩 에러:", problemsRes.error);
        setLoadError(true);
      } else {
        setProblems(problemsRes.data || []);
      }

      if (statsRes.error) {
        // 정답률 칸만 비고 목록은 그대로 보여 준다.
        console.error("정답률 로딩 에러:", statsRes.error);
      } else {
        const newStats: Record<number, { total: number; accepted: number }> = {};
        for (const row of statsRes.data) {
          newStats[row.problem_id] = { total: Number(row.submissions), accepted: Number(row.accepted) };
        }
        setStats(newStats);
      }

      // 맞힌 문제 표시는 로그인한 본인 제출만 기준으로 삼는다.
      if (session) {
        const { data: mySubs } = await fetchAllRows<{ problem_id: number }>((from, to) =>
          supabase
            .from("submissions")
            .select("problem_id")
            .eq("user_id", session.user.id)
            .eq("status", "Accepted")
            .order("id")
            .range(from, to),
        );

        setSolvedIds(new Set((mySubs || []).map((s) => s.problem_id)));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const acceptance = (id: number) => {
    const stat = stats[id];
    if (!stat || stat.total === 0) return null;
    return ((stat.accepted / stat.total) * 100).toFixed(1) + "%";
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredProblems = problems.filter(
    (p) => !query || p.title.toLowerCase().includes(query) || String(p.id).includes(query),
  );

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="page-title">문제</h1>
        </div>
        <input
          type="search"
          aria-label="문제 번호나 제목으로 찾기"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="번호나 제목으로 찾기"
          className="input w-full sm:w-72"
        />
      </div>

      <div className="box mt-8 overflow-hidden">
        {loading ? (
          <p role="status" className="notice p-8">문제를 불러오는 중…</p>
        ) : loadError ? (
          <p role="alert" className="notice-error p-8">
            문제 목록을 불러오지 못했습니다. 새로고침해 주세요.
          </p>
        ) : filteredProblems.length === 0 ? (
          <p className="notice p-8">
            {query
              ? `"${searchQuery.trim()}"에 맞는 문제가 없습니다. 번호나 제목을 다시 확인해 주세요.`
              : "아직 등록된 문제가 없습니다."}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="w-14 sm:w-20">번호</th>
                  <th>제목</th>
                  <th className="w-28 sm:w-40">난이도</th>
                  <th className="num hidden w-28 sm:table-cell">정답률</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((problem) => (
                  <tr key={problem.id} className="row-link relative">
                    <td className="py-2!">
                      <ProblemNumber id={problem.id} solved={solvedIds.has(problem.id)} />
                    </td>
                    <td>
                      <Link href={`/problems/${problem.id}`} className="text-link after:absolute after:inset-0">
                        {problem.title}
                      </Link>
                    </td>
                    <td>
                      <Difficulty value={problem.difficulty} />
                    </td>
                    <td className="num hidden text-muted sm:table-cell">
                      {acceptance(problem.id) ?? <span aria-label="제출 없음">–</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

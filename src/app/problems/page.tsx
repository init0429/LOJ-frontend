"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { CheckSquare, Square } from "lucide-react";

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
  const router = useRouter();

  const [stats, setStats] = useState<Record<number, { total: number; accepted: number }>>({});

  const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const [problemsRes, submissionsRes] = await Promise.all([
        supabase
          .from("problems")
          .select("id, title, time_limit_ms, memory_limit_mb, difficulty")
          .order("id", { ascending: true }),
        // 인용률(정답률)은 전체 유저 기준 통계라 user_id로 안 거름
        supabase.from("submissions").select("problem_id, status"),
      ]);

      if (problemsRes.error) {
        console.error("문제 목록 로딩 에러:", problemsRes.error);
      } else {
        setProblems(problemsRes.data || []);
      }

      if (submissionsRes.data) {
        const newStats: Record<number, { total: number; accepted: number }> = {};
        submissionsRes.data.forEach((sub) => {
          if (!newStats[sub.problem_id]) {
            newStats[sub.problem_id] = { total: 0, accepted: 0 };
          }
          newStats[sub.problem_id].total += 1;
          if (sub.status === "Accepted") {
            newStats[sub.problem_id].accepted += 1;
          }
        });
        setStats(newStats);
      }

      // "해결" 체크 표시는 로그인한 본인 제출만 기준으로 삼아야 함
      // (예전엔 user_id가 없어서 전체 유저 제출을 기준으로 계산했었음 — 버그)
      if (session) {
        const { data: mySubs } = await supabase
          .from("submissions")
          .select("problem_id")
          .eq("user_id", session.user.id)
          .eq("status", "Accepted");

        setSolvedIds(new Set((mySubs || []).map((s) => s.problem_id)));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // 난이도(형량 등급) 5단계 — DB의 difficulty(1~5) 값을 그대로 매핑
  const DIFFICULTY_META: Record<number, { label: string; color: string }> = {
    1: { label: "경범죄", color: "var(--sev-1)" },
    2: { label: "단순범죄", color: "var(--sev-2)" },
    3: { label: "일반범죄", color: "var(--sev-3)" },
    4: { label: "중범죄", color: "var(--sev-4)" },
    5: { label: "흉악범죄", color: "var(--sev-5)" },
  };

  const getDifficulty = (difficulty: number | null) => {
    if (!difficulty || !DIFFICULTY_META[difficulty]) {
      return { label: "미분류", color: "var(--text-faint)" };
    }
    return DIFFICULTY_META[difficulty];
  };

  const getAcceptance = (id: number) => {
    const stat = stats[id];
    if (!stat || stat.total === 0) return "0.0%";
    return ((stat.accepted / stat.total) * 100).toFixed(1) + "%";
  };

  const caseNo = (id: number) => `№ ${String(id).padStart(3, "0")}`;

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-[var(--ink)]">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-end justify-between border-b border-[var(--rule)] pb-4">
          <div>
            <div className="docket-label text-[11px] text-[var(--text-faint)] mb-1">Docket</div>
            <h1 className="text-3xl font-semibold text-[var(--text)]">사건 목록</h1>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="사건번호 · 제목 검색"
              className="px-4 py-2 bg-[var(--paper)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-sm text-[var(--text)] placeholder-[var(--text-faint)]"
            />
            <button className="docket-label text-[11px] px-4 py-2 bg-[var(--paper)] hover:bg-[var(--paper-raised)] border border-[var(--rule)] rounded-sm transition-colors text-[var(--text-dim)]">
              필터
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--seal)]"></div>
          </div>
        ) : (
          <div className="bg-[var(--paper)] border border-[var(--rule)] overflow-hidden">
            <table className="w-full text-left text-sm text-[var(--text)]">
              <thead className="bg-[var(--paper-raised)] docket-label text-[10px] text-[var(--text-dim)] border-b border-[var(--rule)]">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">해결</th>
                  <th className="px-6 py-4 w-28">사건번호</th>
                  <th className="px-6 py-4">제목</th>
                  <th className="px-6 py-4 w-32">인용률</th>
                  <th className="px-6 py-4 w-32">경중</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rule)]">
                {problems.map((problem) => {
                  const diff = getDifficulty(problem.difficulty);
                  const isSolved = solvedIds.has(problem.id);

                  return (
                    <tr
                      key={problem.id}
                      onClick={() => router.push(`/problems/${problem.id}`)}
                      className="hover:bg-[var(--paper-raised)] cursor-pointer transition-colors group border-l-2 border-l-transparent hover:border-l-[var(--seal)]"
                    >
                      <td className="px-6 py-4 text-center">
                        {isSolved ? (
                          <CheckSquare className="inline-block text-[var(--accept)] w-4 h-4" />
                        ) : (
                          <Square className="inline-block text-[var(--rule-strong)] w-4 h-4 group-hover:text-[var(--text-faint)] transition-colors" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-dim)] docket-label text-[11px]">{caseNo(problem.id)}</td>
                      <td className="px-6 py-4 font-medium text-[var(--text)] group-hover:text-[var(--seal)] transition-colors">
                        {problem.title}
                      </td>
                      <td className="px-6 py-4 font-mono text-[var(--text-dim)]">{getAcceptance(problem.id)}</td>
                      <td className="px-6 py-4 docket-label text-[11px]">
                        <span className="inline-flex items-center gap-1.5" style={{ color: diff.color }}>
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: diff.color }}
                          />
                          {diff.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {problems.length === 0 && (
              <div className="text-center py-20 text-[var(--text-dim)]">
                접수된 사건이 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
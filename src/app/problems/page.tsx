"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { CheckSquare, Square } from "lucide-react";
import clsx from "clsx";

interface Problem {
  id: number;
  title: string;
  time_limit_ms: number;
  memory_limit_mb: number;
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [stats, setStats] = useState<Record<number, { total: number; accepted: number }>>({});

  useEffect(() => {
    const fetchData = async () => {
      const [problemsRes, submissionsRes] = await Promise.all([
        supabase
          .from("problems")
          .select("id, title, time_limit_ms, memory_limit_mb")
          .order("id", { ascending: true }),
        supabase.from("submissions").select("problem_id, status")
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

      setLoading(false);
    };

    fetchData();
  }, []);

  const getDifficulty = (id: number) => {
    if (id % 3 === 0) return { label: "중대", color: "text-[var(--reject)]" };
    if (id % 2 === 0) return { label: "보통", color: "text-[var(--pending)]" };
    return { label: "경미", color: "text-[var(--accept)]" };
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
                  const diff = getDifficulty(problem.id);
                  const isSolved = stats[problem.id]?.accepted > 0;

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
                      <td className={clsx("px-6 py-4 docket-label text-[11px]", diff.color)}>
                        {diff.label}
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
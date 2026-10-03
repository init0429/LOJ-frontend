"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { CheckSquare, Square } from "lucide-react";
import { getDifficultyMeta } from "@/lib/difficulty";

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
        const newStats: Record<number, { total: number; accepted: number }> =
          {};
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

  // 난이도(형량 등급) 매핑은 src/lib/difficulty.ts 공용 유틸로 뺐음 (getDifficultyMeta)

  const getAcceptance = (id: number) => {
    const stat = stats[id];
    if (!stat || stat.total === 0) return "0.0%";
    return ((stat.accepted / stat.total) * 100).toFixed(1) + "%";
  };

  const caseNo = (id: number) => `№ ${String(id).padStart(3, "0")}`;

  const filteredProblems = problems.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.title.toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      caseNo(p.id).toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-(--ink)">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end justify-between pb-4">
          <div>
            <h1 className="page-heading">
              사건 목록
            </h1>
            <p className="mt-2 text-sm text-(--text-dim)">문제를 선택하고 나만의 풀이를 작성하세요.</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              aria-label="사건번호 또는 문제 제목 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="사건번호 · 제목 검색"
              className="w-full sm:w-72 px-4 py-3 bg-(--paper) border border-(--rule) rounded-lg text-sm text-(--text) placeholder-(--text-faint)"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-(--seal)"></div>
          </div>
        ) : (
          <div className="data-surface">
            <table className="w-full text-left text-sm text-(--text)">
              <thead className="bg-(--paper-raised) docket-label text-[10px] text-(--text-dim) border-b border-(--rule)">
                <tr>
                  <th className="px-6 py-4 w-16 text-center">해결</th>
                  <th className="px-6 py-4 w-28">사건번호</th>
                  <th className="px-6 py-4">제목</th>
                  <th className="px-6 py-4 w-32">인용률</th>
                  <th className="px-6 py-4 w-32">경중</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--rule)">
                {filteredProblems.map((problem) => {
                  const diff = getDifficultyMeta(problem.difficulty);
                  const isSolved = solvedIds.has(problem.id);

                  return (
                    <tr
                      key={problem.id}
                      onClick={() => router.push(`/problems/${problem.id}`)}
                      className="hover:bg-(--paper-raised) cursor-pointer transition-colors group border-l-2 border-l-transparent hover:border-l-(--seal)"
                    >
                      <td className="px-6 py-4 text-center">
                        {isSolved ? (
                          <CheckSquare className="inline-block text-(--accept) w-4 h-4" />
                        ) : (
                          <Square className="inline-block text-(--rule-strong) w-4 h-4 group-hover:text-(--text-faint) transition-colors" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-(--text-dim) docket-label text-[11px]">
                        {caseNo(problem.id)}
                      </td>
                      <td className="px-6 py-4 font-medium text-(--text) group-hover:text-(--seal) transition-colors">
                        {problem.title}
                      </td>
                      <td className="px-6 py-4 font-mono text-(--text-dim)">
                        {getAcceptance(problem.id)}
                      </td>
                      <td className="px-6 py-4 docket-label text-[11px]">
                        <span
                          className="inline-flex items-center gap-1.5"
                          style={{ color: diff.color }}
                        >
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

            {filteredProblems.length === 0 && (
              <div className="text-center py-20 text-(--text-dim)">
                {searchQuery
                  ? "검색 결과가 없습니다."
                  : "접수된 사건이 없습니다."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

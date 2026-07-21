"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle } from "lucide-react";
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

  useEffect(() => {
    const fetchProblems = async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("id, title, time_limit_ms, memory_limit_mb")
        .order("id", { ascending: true });

      if (error) {
        console.error("문제 목록 로딩 에러:", error);
      } else {
        setProblems(data || []);
      }
      setLoading(false);
    };

    fetchProblems();
  }, []);

  // 가상의 데이터 생성 로직 (프로페셔널한 느낌을 주기 위함)
  const getDifficulty = (id: number) => {
    if (id % 3 === 0) return { label: "Hard", color: "text-red-400" };
    if (id % 2 === 0) return { label: "Medium", color: "text-yellow-400" };
    return { label: "Easy", color: "text-emerald-400" };
  };

  const getAcceptance = (id: number) => {
    return (40 + (id * 17) % 50).toFixed(1) + "%";
  };

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">문제 목록</h1>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="문제 검색..." 
              className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 text-sm"
            />
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
              필터
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium w-16 text-center">상태</th>
                  <th className="px-6 py-4 font-medium w-24">#</th>
                  <th className="px-6 py-4 font-medium">제목</th>
                  <th className="px-6 py-4 font-medium w-32">정답률</th>
                  <th className="px-6 py-4 font-medium w-32">난이도</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {problems.map((problem) => {
                  const diff = getDifficulty(problem.id);
                  // 가상의 상태 (문제 1번만 풀었다고 가정)
                  const isSolved = problem.id === 1;
                  
                  return (
                    <tr 
                      key={problem.id}
                      onClick={() => router.push(`/problems/${problem.id}`)}
                      className="hover:bg-slate-800/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4 text-center">
                        {isSolved ? (
                          <CheckCircle2 className="inline-block text-emerald-500 w-5 h-5" />
                        ) : (
                          <Circle className="inline-block text-slate-700 w-5 h-5 group-hover:text-slate-500 transition-colors" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono">{problem.id}</td>
                      <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-emerald-400 transition-colors">
                        {problem.title}
                      </td>
                      <td className="px-6 py-4 font-mono">{getAcceptance(problem.id)}</td>
                      <td className={clsx("px-6 py-4 font-medium", diff.color)}>
                        {diff.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {problems.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                등록된 문제가 없습니다.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

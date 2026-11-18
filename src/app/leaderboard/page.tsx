"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserRank {
  rank: number;
  user_id: string;
  username: string;
  rating: number;
  solved: number;
}

// 점수 구간별 등급. 1등급이 가장 높다.
const GRADES = [
  { min: 10000, grade: 1 },
  { min: 5000, grade: 2 },
  { min: 1000, grade: 3 },
  { min: 100, grade: 4 },
  { min: 0, grade: 5 },
];
const gradeOf = (rating: number) => GRADES.find((g) => rating >= g.min)?.grade ?? 5;

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [rankings, setRankings] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // leaderboard는 뷰: 유저별 distinct 해결 문제 수 + 난이도 기반 점수를 이미 계산해둠
      const { data, error } = await supabase
        .from("leaderboard")
        .select("user_id, username, solved, rating")
        .order("rating", { ascending: false });

      if (error) {
        console.error("순위 로딩 에러:", error);
        setLoadError(true);
      } else if (data) {
        setRankings(
          data.map((row, i) => ({
            rank: i + 1,
            user_id: row.user_id,
            username: row.username,
            rating: row.rating ?? 0,
            solved: row.solved ?? 0,
          })),
        );
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const filtered = rankings.filter((user) => user.username.toLowerCase().includes(query));

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="page-title">순위</h1>
          <p className="page-lead">어려운 문제를 맞힐수록 점수가 높습니다. 같은 문제는 한 번만 셉니다.</p>
        </div>
        <input
          type="search"
          aria-label="이름으로 찾기"
          placeholder="이름으로 찾기"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full sm:w-72"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <p role="status" className="notice py-8">순위를 불러오는 중…</p>
        ) : loadError ? (
          <p role="alert" className="notice-error py-8">순위를 불러오지 못했습니다. 새로고침해 주세요.</p>
        ) : filtered.length === 0 ? (
          <p className="notice py-8">
            {query
              ? `"${searchQuery.trim()}"이 들어간 이름이 없습니다.`
              : "아직 문제를 맞힌 사람이 없습니다. 첫 줄에 이름을 올려 보세요."}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="w-14 sm:w-20">순위</th>
                  <th>이름</th>
                  <th className="hidden w-28 sm:table-cell">등급</th>
                  <th className="num hidden w-32 sm:table-cell">맞힌 문제</th>
                  <th className="num w-32">점수</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.user_id}>
                    <td className="tabular-nums">{user.rank}</td>
                    <td className="font-medium">{user.username}</td>
                    <td className="hidden sm:table-cell">{gradeOf(user.rating)}등급</td>
                    <td className="num hidden text-muted sm:table-cell">{user.solved.toLocaleString()}</td>
                    <td className="num font-semibold">{user.rating.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              등급은 사람의 점수 구간입니다(문제 난이도와는 다름):{" "}
              {GRADES.map((g) => (g.min ? `${g.grade}등급 ${g.min.toLocaleString("ko-KR")}점 이상` : `${g.grade}등급 그 아래`)).join(" · ")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search } from "lucide-react";
import clsx from "clsx";
import StampTag, { StampTone } from "@/components/StampTag";

type Tier = "대법관" | "부장판사" | "검사" | "변호사" | "수습생";

interface UserRank {
  rank: number;
  user_id: string;
  username: string;
  rating: number;
  solved: number;
  tier: Tier;
}

// rating 구간별 사법부 직급. 문제 난이도(경범죄~흉악범죄, 100~500점) 기준으로
// 대략 잡은 임계값이라 실제 운영해보고 문제 수/난이도 분포 보면서 조정하면 됨.
const getTier = (rating: number): Tier => {
  if (rating >= 2000) return "대법관";
  if (rating >= 1000) return "부장판사";
  if (rating >= 500) return "검사";
  if (rating >= 100) return "변호사";
  return "수습생";
};

const getTierTone = (tier: Tier): StampTone => {
  switch (tier) {
    case "대법관": return "reject";
    case "부장판사": return "pending";
    case "검사": return "neutral";
    case "변호사": return "neutral";
    case "수습생": return "accept";
    default: return "neutral";
  }
};

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [rankings, setRankings] = useState<UserRank[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      // leaderboard는 뷰: 유저별 distinct 해결 문제 수 + 난이도 기반 점수를 이미 계산해둠
      const { data, error } = await supabase
        .from("leaderboard")
        .select("user_id, username, solved, rating")
        .order("rating", { ascending: false });

      if (error) {
        console.error("명부 로딩 에러:", error);
      } else if (data) {
        setRankings(
          data.map((row, i) => ({
            rank: i + 1,
            user_id: row.user_id,
            username: row.username,
            rating: row.rating ?? 0,
            solved: row.solved ?? 0,
            tier: getTier(row.rating ?? 0),
          }))
        );
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  const filtered = rankings.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-[var(--ink)] min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 border-b border-[var(--rule)] pb-6">
          <div className="docket-label text-[11px] text-[var(--text-faint)] mb-1">Register</div>
          <h1 className="text-3xl font-semibold text-[var(--text)]">명부</h1>
          <p className="text-[var(--text-dim)] mt-1">사건을 가장 많이 해결한 순서로 정리된 기록입니다.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" size={18} />
          <input
            type="text"
            placeholder="이름으로 조회"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--paper)] border border-[var(--rule)] text-[var(--text)] pl-11 pr-4 py-3 rounded-sm focus:outline-none focus:border-[var(--seal)] transition-colors placeholder-[var(--text-faint)]"
          />
        </div>

        {/* Leaderboard Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--seal)]"></div>
          </div>
        ) : (
          <div className="bg-[var(--paper)] border border-[var(--rule)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--paper-raised)] border-b border-[var(--rule)] docket-label text-[10px] text-[var(--text-dim)]">
                <tr>
                  <th className="px-6 py-4 w-20 text-center">순번</th>
                  <th className="px-6 py-4">이름</th>
                  <th className="px-6 py-4 w-32 text-center">평점</th>
                  <th className="px-6 py-4 w-32 text-center">해결 사건</th>
                  <th className="px-6 py-4 w-40 text-center">등급</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rule)]">
                {filtered.map((user) => (
                  <tr
                    key={user.user_id}
                    className={clsx(
                      "transition-colors hover:bg-[var(--paper-raised)] border-l-2",
                      user.rank <= 3 ? "border-l-[var(--seal)]" : "border-l-transparent"
                    )}
                  >
                    <td className="px-6 py-4 text-center docket-label text-[13px] text-[var(--text-dim)]">
                      {String(user.rank).padStart(2, "0")}
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--text)]">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-[var(--text)]">
                      {user.rating.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-[var(--text-dim)]">
                      {user.solved.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StampTag label={user.tier} tone={getTierTone(user.tier)} size="sm" />
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-[var(--text-dim)]">
                      조회된 이름이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
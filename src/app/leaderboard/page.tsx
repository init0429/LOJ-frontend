"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import StampTag, { StampTone } from "@/components/StampTag";

interface UserRank {
  rank: number;
  username: string;
  rating: number;
  solved: number;
  tier: "Grandmaster" | "Master" | "Expert" | "Specialist" | "Pupil";
}

const mockLeaderboard: UserRank[] = [
  { rank: 1, username: "tourist_kr", rating: 3500, solved: 1250, tier: "Grandmaster" },
  { rank: 2, username: "algo_machine", rating: 3120, solved: 980, tier: "Grandmaster" },
  { rank: 3, username: "dp_master", rating: 2950, solved: 870, tier: "Master" },
  { rank: 4, username: "graph_searcher", rating: 2800, solved: 750, tier: "Master" },
  { rank: 5, username: "greedy_boy", rating: 2600, solved: 600, tier: "Expert" },
  { rank: 6, username: "brute_force99", rating: 2450, solved: 520, tier: "Expert" },
  { rank: 7, username: "math_genius", rating: 2200, solved: 480, tier: "Specialist" },
  { rank: 8, username: "string_lover", rating: 1950, solved: 410, tier: "Specialist" },
  { rank: 9, username: "coding_newbie", rating: 1500, solved: 150, tier: "Pupil" },
  { rank: 10, username: "hello_world", rating: 1200, solved: 50, tier: "Pupil" },
];

const getTierTone = (tier: UserRank["tier"]): StampTone => {
  switch (tier) {
    case "Grandmaster": return "reject";
    case "Master": return "pending";
    case "Expert": return "neutral";
    case "Specialist": return "neutral";
    case "Pupil": return "accept";
    default: return "neutral";
  }
};

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockLeaderboard.filter(user =>
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
                  key={user.rank}
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
      </div>
    </div>
  );
}
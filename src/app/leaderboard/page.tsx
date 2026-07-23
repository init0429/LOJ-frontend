"use client";

import { useState } from "react";
import { Crown, Medal, Search, TrendingUp, Star } from "lucide-react";
import clsx from "clsx";

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

const getTierColor = (tier: UserRank["tier"]) => {
  switch (tier) {
    case "Grandmaster": return "text-red-500 bg-red-500/10 border-red-500/20";
    case "Master": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    case "Expert": return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    case "Specialist": return "text-cyan-500 bg-cyan-500/10 border-cyan-500/20";
    case "Pupil": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    default: return "text-slate-400 bg-slate-800 border-slate-700";
  }
};

const getMedalIcon = (rank: number) => {
  if (rank === 1) return <Crown className="text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" size={28} />;
  if (rank === 2) return <Medal className="text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.8)]" size={26} />;
  if (rank === 3) return <Medal className="text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.8)]" size={24} />;
  return <span className="text-slate-500 font-bold text-lg w-7 text-center">{rank}</span>;
};

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mockLeaderboard.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 min-h-[calc(100vh-64px)]">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl mb-4">
            <TrendingUp className="text-emerald-400 mr-2" size={32} />
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              글로벌 리더보드
            </h1>
          </div>
          <p className="text-slate-400 text-lg">최고의 코더들이 모인 명예의 전당입니다.</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative max-w-md mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input 
            type="text" 
            placeholder="유저 검색..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-12 py-4 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-lg text-lg"
          />
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 border-b border-slate-800">
              <tr>
                <th className="px-6 py-5 font-semibold text-slate-400 w-24 text-center">순위</th>
                <th className="px-6 py-5 font-semibold text-slate-400">유저명</th>
                <th className="px-6 py-5 font-semibold text-slate-400 w-32 text-center">레이팅</th>
                <th className="px-6 py-5 font-semibold text-slate-400 w-32 text-center">해결한 문제</th>
                <th className="px-6 py-5 font-semibold text-slate-400 w-40 text-center">티어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map((user) => (
                <tr 
                  key={user.rank} 
                  className={clsx(
                    "group transition-colors hover:bg-slate-800/50",
                    user.rank <= 3 ? "bg-slate-900/40" : ""
                  )}
                >
                  <td className="px-6 py-5 flex justify-center items-center h-full">
                    {getMedalIcon(user.rank)}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "font-bold text-lg",
                        user.rank === 1 ? "text-yellow-400" :
                        user.rank === 2 ? "text-slate-300" :
                        user.rank === 3 ? "text-amber-600" :
                        "text-slate-200 group-hover:text-white transition-colors"
                      )}>
                        {user.username}
                      </span>
                      {user.rank === 1 && <Star className="text-yellow-400 fill-yellow-400 ml-2" size={16} />}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center font-mono text-lg font-semibold text-slate-300">
                    {user.rating.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 text-center text-slate-400 font-mono">
                    {user.solved.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-xs font-bold border",
                      getTierColor(user.tier)
                    )}>
                      {user.tier}
                    </span>
                  </td>
                </tr>
              ))}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-500 text-lg">
                    검색 결과가 없습니다.
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

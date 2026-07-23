"use client";

import { useState } from "react";
import { Trophy, Clock, Calendar, Users, ChevronRight, Sparkles } from "lucide-react";
import clsx from "clsx";

interface Contest {
  id: number;
  title: string;
  status: "ongoing" | "upcoming" | "past";
  startTime: string;
  endTime: string;
  participants: number;
  color: string;
}

const mockContests: Contest[] = [
  { id: 1, title: "LOJ Weekly Challenge #1", status: "ongoing", startTime: "2026-07-22T10:00:00", endTime: "2026-07-22T14:00:00", participants: 1284, color: "from-purple-500 to-indigo-500" },
  { id: 2, title: "Algorithm Masters Cup 2026", status: "upcoming", startTime: "2026-08-01T09:00:00", endTime: "2026-08-01T18:00:00", participants: 350, color: "from-emerald-500 to-teal-500" },
  { id: 3, title: "Beginner Friendly Div.3", status: "upcoming", startTime: "2026-07-25T14:00:00", endTime: "2026-07-25T16:00:00", participants: 890, color: "from-blue-500 to-cyan-500" },
  { id: 4, title: "Summer Coding Festival", status: "past", startTime: "2026-07-01T00:00:00", endTime: "2026-07-07T23:59:59", participants: 5210, color: "from-orange-500 to-red-500" },
  { id: 5, title: "LOJ Beta Tester Contest", status: "past", startTime: "2026-06-15T12:00:00", endTime: "2026-06-15T15:00:00", participants: 120, color: "from-slate-600 to-slate-800" },
];

export default function ContestsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "ongoing" | "upcoming" | "past">("all");

  const filtered = mockContests.filter(c => activeTab === "all" || c.status === activeTab);

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold flex items-center gap-3 mb-2">
              <Trophy className="text-yellow-400" size={36} />
              <span className="bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                콘테스트
              </span>
            </h1>
            <p className="text-slate-400 text-lg">전 세계의 개발자들과 알고리즘 실력을 겨루어 보세요.</p>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-slate-900/80 backdrop-blur p-1.5 rounded-xl border border-slate-800 self-start md:self-auto shadow-lg">
            {[
              { id: "all", label: "전체" },
              { id: "ongoing", label: "진행 중" },
              { id: "upcoming", label: "예정됨" },
              { id: "past", label: "종료됨" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300",
                  activeTab === tab.id 
                    ? "bg-slate-800 text-white shadow-md border border-slate-700" 
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contest List */}
        <div className="space-y-5">
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <Sparkles className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400 text-lg">해당하는 콘테스트가 없습니다.</p>
            </div>
          ) : (
            filtered.map((contest) => (
              <div 
                key={contest.id}
                className="group relative bg-slate-900/60 backdrop-blur-md border border-slate-800 hover:border-slate-600 rounded-2xl p-1 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 cursor-pointer"
              >
                {/* Glowing edge effect on hover */}
                <div className={clsx(
                  "absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-20 transition-opacity duration-500",
                  contest.color
                )} />
                
                <div className="relative bg-slate-900 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {contest.status === "ongoing" && (
                        <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span> Live
                        </span>
                      )}
                      {contest.status === "upcoming" && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                          Upcoming
                        </span>
                      )}
                      {contest.status === "past" && (
                        <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                          Finished
                        </span>
                      )}
                      <span className="text-slate-500 text-sm flex items-center gap-1.5">
                        <Users size={14} /> {contest.participants.toLocaleString()}명 참여
                      </span>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-slate-200 group-hover:text-white transition-colors mb-2">
                      {contest.title}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={16} className="text-slate-500" />
                        {new Date(contest.startTime).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={16} className="text-slate-500" />
                        {new Date(contest.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                        {" ~ "} 
                        {new Date(contest.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <button className={clsx(
                      "px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2",
                      contest.status === "ongoing" 
                        ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                        : contest.status === "upcoming"
                          ? "bg-slate-800 hover:bg-slate-700 text-emerald-400"
                          : "bg-slate-800/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    )}>
                      {contest.status === "ongoing" ? "대회 입장" : contest.status === "upcoming" ? "알림 설정" : "결과 보기"}
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

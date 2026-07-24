"use client";

import { useState } from "react";
import { Calendar, Clock, Users, ChevronRight } from "lucide-react";
import clsx from "clsx";
import StampTag, { StampTone } from "@/components/StampTag";

interface Contest {
  id: number;
  title: string;
  status: "ongoing" | "upcoming" | "past";
  startTime: string;
  endTime: string;
  participants: number;
}

const mockContests: Contest[] = [
  { id: 1, title: "LOJ Weekly Challenge #1", status: "ongoing", startTime: "2026-07-22T10:00:00", endTime: "2026-07-22T14:00:00", participants: 1284 },
  { id: 2, title: "Algorithm Masters Cup 2026", status: "upcoming", startTime: "2026-08-01T09:00:00", endTime: "2026-08-01T18:00:00", participants: 350 },
  { id: 3, title: "Beginner Friendly Div.3", status: "upcoming", startTime: "2026-07-25T14:00:00", endTime: "2026-07-25T16:00:00", participants: 890 },
  { id: 4, title: "Summer Coding Festival", status: "past", startTime: "2026-07-01T00:00:00", endTime: "2026-07-07T23:59:59", participants: 5210 },
  { id: 5, title: "LOJ Beta Tester Contest", status: "past", startTime: "2026-06-15T12:00:00", endTime: "2026-06-15T15:00:00", participants: 120 },
];

const STATUS_META: Record<Contest["status"], { label: string; tone: StampTone; action: string }> = {
  ongoing: { label: "심리 중", tone: "reject", action: "참가하기" },
  upcoming: { label: "예정", tone: "pending", action: "알림 신청" },
  past: { label: "종결", tone: "neutral", action: "판결문 보기" },
};

export default function ContestsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "ongoing" | "upcoming" | "past">("all");

  const filtered = mockContests.filter(c => activeTab === "all" || c.status === activeTab);

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-[var(--ink)] min-h-[calc(100vh-64px)]">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[var(--rule)] pb-6">
          <div>
            <div className="docket-label text-[11px] text-[var(--text-faint)] mb-1">Docket Calendar</div>
            <h1 className="text-3xl font-semibold text-[var(--text)]">심리 일정</h1>
            <p className="text-[var(--text-dim)] mt-1">동아리·대회 일정에 맞춰 진행되는 공개 심리 목록입니다.</p>
          </div>

          {/* Tabs */}
          <div className="flex border border-[var(--rule)] self-start md:self-auto">
            {[
              { id: "all", label: "전체" },
              { id: "ongoing", label: "심리 중" },
              { id: "upcoming", label: "예정" },
              { id: "past", label: "종결" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "docket-label text-[11px] px-4 py-2 transition-colors border-r border-[var(--rule)] last:border-r-0",
                  activeTab === tab.id
                    ? "bg-[var(--paper-raised)] text-[var(--seal)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--paper)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contest List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-20 bg-[var(--paper)] border border-[var(--rule)]">
              <p className="text-[var(--text-dim)]">해당하는 일정이 없습니다.</p>
            </div>
          ) : (
            filtered.map((contest) => {
              const meta = STATUS_META[contest.status];
              return (
                <div
                  key={contest.id}
                  className="group bg-[var(--paper)] border border-[var(--rule)] hover:border-[var(--rule-strong)] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors border-l-2 border-l-transparent hover:border-l-[var(--seal)]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <StampTag label={meta.label} tone={meta.tone} size="sm" />
                      <span className="text-[var(--text-faint)] text-sm flex items-center gap-1.5">
                        <Users size={14} /> {contest.participants.toLocaleString()}명 참여
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-[var(--text)] group-hover:text-[var(--seal)] transition-colors mb-2">
                      {contest.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-dim)]">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-[var(--text-faint)]" />
                        {new Date(contest.startTime).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-[var(--text-faint)]" />
                        {new Date(contest.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" ~ "}
                        {new Date(contest.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      className={clsx(
                        "docket-label text-[11px] px-5 py-2.5 flex items-center gap-2 transition-colors",
                        contest.status === "ongoing"
                          ? "bg-[var(--seal)] text-[var(--ink)] hover:bg-[var(--seal-dim)]"
                          : "bg-[var(--paper-raised)] text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--rule)]"
                      )}
                    >
                      {meta.action}
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import clsx from "clsx";
import StampTag, { StampTone } from "@/components/StampTag";

interface Contest {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
}

type Phase = "ongoing" | "upcoming" | "past";

const getPhase = (contest: Contest): Phase => {
  const now = Date.now();
  const start = new Date(contest.start_time).getTime();
  const end = new Date(contest.end_time).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "past";
  return "ongoing";
};

const PHASE_META: Record<Phase, { label: string; tone: StampTone; action: string }> = {
  ongoing: { label: "심리 중", tone: "reject", action: "참가하기" },
  upcoming: { label: "예정", tone: "pending", action: "일정 확인" },
  past: { label: "종결", tone: "neutral", action: "판결문 보기" },
};

export default function ContestsPage() {
  const [activeTab, setActiveTab] = useState<"all" | Phase>("all");
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchContests = async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("id, title, description, start_time, end_time")
        .order("start_time", { ascending: false });

      if (error) console.error("콘테스트 목록 로딩 에러:", error);
      else setContests(data || []);
      setLoading(false);
    };
    fetchContests();
  }, []);

  const filtered = contests.filter((c) => activeTab === "all" || getPhase(c) === activeTab);

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
              { id: "past", label: "종결" },
            ].map((tab) => (
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
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--seal)]"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-20 bg-[var(--paper)] border border-[var(--rule)]">
                <p className="text-[var(--text-dim)]">해당하는 일정이 없습니다.</p>
              </div>
            ) : (
              filtered.map((contest) => {
                const phase = getPhase(contest);
                const meta = PHASE_META[phase];
                return (
                  <div
                    key={contest.id}
                    onClick={() => router.push(`/contests/${contest.id}`)}
                    className="group bg-[var(--paper)] border border-[var(--rule)] hover:border-[var(--rule-strong)] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors border-l-2 border-l-transparent hover:border-l-[var(--seal)] cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <StampTag label={meta.label} tone={meta.tone} size="sm" />
                      </div>

                      <h2 className="text-xl font-semibold text-[var(--text)] group-hover:text-[var(--seal)] transition-colors mb-2">
                        {contest.title}
                      </h2>

                      {contest.description && (
                        <p className="text-[var(--text-dim)] text-sm mb-3 line-clamp-2">{contest.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-dim)]">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-[var(--text-faint)]" />
                          {new Date(contest.start_time).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-[var(--text-faint)]" />
                          {new Date(contest.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" ~ "}
                          {new Date(contest.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        className={clsx(
                          "docket-label text-[11px] px-5 py-2.5 flex items-center gap-2 transition-colors",
                          phase === "ongoing"
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
        )}
      </div>
    </div>
  );
}
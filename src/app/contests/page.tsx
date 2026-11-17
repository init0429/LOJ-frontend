"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatRange, formatUntil } from "@/lib/format";

interface Contest {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
}

type Phase = "ongoing" | "upcoming" | "past";

const getPhase = (contest: Contest, now: number): Phase => {
  const start = new Date(contest.start_time).getTime();
  const end = new Date(contest.end_time).getTime();
  if (now < start) return "upcoming";
  if (now >= end) return "past";
  return "ongoing";
};

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "ongoing", label: "진행 중" },
  { id: "upcoming", label: "예정" },
  { id: "past", label: "종료" },
] as const;

const EMPTY: Record<(typeof FILTERS)[number]["id"], string> = {
  all: "아직 열린 대회가 없습니다.",
  ongoing: "지금 진행 중인 대회가 없습니다.",
  upcoming: "예정된 대회가 없습니다.",
  past: "끝난 대회가 없습니다.",
};

export default function ContestsPage() {
  const [filter, setFilter] = useState<"all" | Phase>("all");
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchContests = async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("id, title, description, start_time, end_time")
        .order("start_time", { ascending: false });

      if (error) {
        console.error("대회 목록 로딩 에러:", error);
        setLoadError(true);
      } else {
        setContests(data || []);
      }
      setNow(Date.now());
      setLoading(false);
    };
    fetchContests();
  }, []);

  const filtered = contests.filter((c) => filter === "all" || getPhase(c, now) === filter);

  return (
    <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div>
          <h1 className="page-title">대회</h1>
          <p className="page-lead">정해진 시간 동안 같은 문제를 풉니다. 진행 중인 대회는 바로 참가할 수 있습니다.</p>
        </div>
        <div role="group" aria-label="대회 상태로 걸러 보기" className="-mx-2 flex flex-wrap gap-0.5">
          {FILTERS.map((item) => (
            <button key={item.id} className="choice" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sheet mt-8 overflow-hidden">
        {loading ? (
          <p role="status" className="notice p-8">대회를 불러오는 중…</p>
        ) : loadError ? (
          <p role="alert" className="notice-error p-8">대회 목록을 불러오지 못했습니다. 새로고침해 주세요.</p>
        ) : filtered.length === 0 ? (
          <p className="notice p-8">{EMPTY[filter]}</p>
        ) : (
          <ul>
            {filtered.map((contest) => {
              const phase = getPhase(contest, now);
              return (
                <li key={contest.id} className="relative flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-line px-6 py-5 first:border-t-0 hover:bg-tint/50 sm:px-8">
                  <div className="min-w-0 max-w-[44em]">
                    <h2 className="text-lg font-extrabold leading-snug">
                      <Link href={`/contests/${contest.id}`} className="after:absolute after:inset-0">
                        {contest.title}
                      </Link>
                    </h2>
                    {contest.description && <p className="mt-1 line-clamp-2 text-pencil">{contest.description}</p>}
                    <p className="mt-1 text-sm text-pencil">{formatRange(contest.start_time, contest.end_time)}</p>
                  </div>
                  {phase === "ongoing" ? (
                    <span className="btn btn-sm btn-fill">참가하기</span>
                  ) : phase === "upcoming" ? (
                    <span className="text-sm font-bold text-print-ink">
                      {formatUntil(new Date(contest.start_time).getTime() - now)} 시작
                    </span>
                  ) : (
                    <span className="text-sm text-pencil">종료</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import clsx from "clsx";
import StampTag from "@/components/StampTag";
import AdminTabs from "@/components/AdminTabs";
import { errorMessage } from "@/lib/errors";

interface Problem {
  id: number;
  title: string;
  difficulty: number | null;
}

interface ContestRow {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
}

export default function AdminContestsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [existing, setExisting] = useState<ContestRow[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  // 선택 순서를 곧 출제 순서로 씀
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 관리자 권한 확인 — profiles.is_admin이 아니면 접근 차단
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();

      setIsAdmin(!!profile?.is_admin);
      setChecking(false);
    })();
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [{ data: probs }, { data: contests }] = await Promise.all([
        supabase.from("problems").select("id, title, difficulty").order("id"),
        supabase
          .from("contests")
          .select("id, title, start_time, end_time")
          .order("start_time", { ascending: false }),
      ]);
      setProblems(probs || []);
      setExisting(contests || []);
    })();
  }, [isAdmin]);

  const toggleProblem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    setError(null);

    if (!title.trim()) return setError("제목을 입력하세요.");
    if (!startTime || !endTime) return setError("시작/종료 시각을 입력하세요.");
    if (new Date(startTime) >= new Date(endTime))
      return setError("종료 시각이 시작 시각보다 늦어야 합니다.");
    if (selectedIds.length === 0)
      return setError("문제를 하나 이상 선택하세요.");

    setSubmitting(true);
    try {
      const { data: contest, error: contestErr } = await supabase
        .from("contests")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          start_time: new Date(startTime).toISOString(),
          end_time: new Date(endTime).toISOString(),
        })
        .select()
        .single();

      if (contestErr) throw contestErr;

      const rows = selectedIds.map((problem_id, idx) => ({
        contest_id: contest.id,
        problem_id,
        order: idx + 1,
      }));

      const { error: linkErr } = await supabase
        .from("contest_problems")
        .insert(rows);
      if (linkErr) throw linkErr;

      setExisting((prev) => [contest, ...prev]);
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setSelectedIds([]);
    } catch (err) {
      setError(errorMessage(err, "생성 중 오류가 발생했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="h-screen bg-(--ink) flex items-center justify-center text-(--seal)">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen bg-(--ink) flex flex-col items-center justify-center gap-4 text-center px-6">
        <StampTag label="기각" tone="reject" size="lg" />
        <p className="text-(--text-dim)">
          관리자만 접근할 수 있는 화면입니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-(--ink) min-h-[calc(100vh-64px)]">
      <div className="max-w-3xl mx-auto">
        <AdminTabs />
        <h1 className="text-2xl font-semibold text-(--text) mb-6">
          콘테스트 개설
        </h1>

        <div className="bg-(--paper) border border-(--rule) p-6 space-y-5 mb-10">
          <div>
            <label className="docket-label block text-[11px] text-(--text-dim) mb-1.5">
              제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 bg-(--ink) border border-(--rule) rounded-sm focus:outline-none focus:border-(--seal) text-(--text)"
              placeholder="예: 2026 여름방학 알고리즘 심리"
            />
          </div>

          <div>
            <label className="docket-label block text-[11px] text-(--text-dim) mb-1.5">
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 bg-(--ink) border border-(--rule) rounded-sm focus:outline-none focus:border-(--seal) text-(--text) resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="docket-label block text-[11px] text-(--text-dim) mb-1.5">
                시작 시각
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-(--ink) border border-(--rule) rounded-sm focus:outline-none focus:border-(--seal) text-(--text)"
              />
            </div>
            <div>
              <label className="docket-label block text-[11px] text-(--text-dim) mb-1.5">
                종료 시각
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-(--ink) border border-(--rule) rounded-sm focus:outline-none focus:border-(--seal) text-(--text)"
              />
            </div>
          </div>

          <div>
            <label className="docket-label block text-[11px] text-(--text-dim) mb-2">
              출제 문제 (클릭한 순서대로 출제 순서가 됩니다)
            </label>
            <div className="border border-(--rule) divide-y divide-(--rule) max-h-72 overflow-y-auto">
              {problems.map((p) => {
                const order = selectedIds.indexOf(p.id);
                const selected = order !== -1;
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProblem(p.id)}
                    className={clsx(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                      selected
                        ? "bg-(--seal)/10"
                        : "hover:bg-(--paper-raised)",
                    )}
                  >
                    <span
                      className={clsx(
                        "w-5 h-5 shrink-0 border flex items-center justify-center text-[10px] docket-label",
                        selected
                          ? "border-(--seal) bg-(--seal) text-(--ink)"
                          : "border-(--rule-strong) text-transparent",
                      )}
                    >
                      {selected ? order + 1 : <Check size={12} />}
                    </span>
                    <span className="docket-label text-[10px] text-(--text-faint)">
                      № {String(p.id).padStart(3, "0")}
                    </span>
                    <span className="text-sm text-(--text)">
                      {p.title}
                    </span>
                  </button>
                );
              })}
              {problems.length === 0 && (
                <div className="px-4 py-6 text-center text-(--text-dim) text-sm">
                  등록된 문제가 없습니다.
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2">
              <StampTag label="반려" tone="reject" size="sm" tilt={false} />
              <p className="text-sm text-(--reject)">{error}</p>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={submitting}
            className="w-full py-3 bg-(--seal) hover:bg-(--seal-dim) text-(--ink) font-semibold rounded-sm transition-colors disabled:opacity-50"
          >
            {submitting ? "개설 중..." : "콘테스트 개설"}
          </button>
        </div>

        {/* 이미 만든 콘테스트 목록 */}
        <div>
          <h2 className="docket-label text-[11px] text-(--text-faint) mb-3">
            기존 콘테스트
          </h2>
          <div className="border border-(--rule) divide-y divide-(--rule)">
            {existing.map((c) => (
              <div
                key={c.id}
                className="px-4 py-3 flex items-center justify-between text-sm"
              >
                <span className="text-(--text)">{c.title}</span>
                <div className="flex items-center gap-4">
                  <span className="text-(--text-dim) text-xs">
                    {new Date(c.start_time).toLocaleString()} ~{" "}
                    {new Date(c.end_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Link
                    href={`/admin/contests/${c.id}/results`}
                    className="docket-label text-[10px] text-(--seal) hover:text-(--seal-dim) transition-colors whitespace-nowrap"
                  >
                    결과 보기
                  </Link>
                </div>
              </div>
            ))}
            {existing.length === 0 && (
              <div className="px-4 py-6 text-center text-(--text-dim) text-sm">
                아직 개설된 콘테스트가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

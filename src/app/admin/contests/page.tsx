"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminGate from "@/components/AdminGate";
import AdminTabs from "@/components/AdminTabs";
import { errorMessage } from "@/lib/errors";
import { formatRange } from "@/lib/format";

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

const letter = (index: number) => String.fromCharCode(65 + (index % 26));

export default function AdminContestsPage() {
  const { checking, isAdmin } = useIsAdmin();

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
  const [created, setCreated] = useState<string | null>(null);

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
    setCreated(null);

    if (!title.trim()) return setError("제목을 적어 주세요.");
    if (!startTime || !endTime) return setError("시작과 끝 시각을 모두 정해 주세요.");
    if (new Date(startTime) >= new Date(endTime))
      return setError("끝나는 시각이 시작 시각보다 뒤여야 합니다.");
    if (selectedIds.length === 0)
      return setError("문제를 하나 이상 골라 주세요.");

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
      setCreated(`“${contest.title}” 대회를 열었습니다.`);
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setSelectedIds([]);
    } catch (err) {
      setError(errorMessage(err, "대회를 열지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setSubmitting(false);
    }
  };

  if (checking || !isAdmin) return <AdminGate checking={checking} isAdmin={isAdmin} />;

  return (
    <div className="page page-narrow">
      <AdminTabs />
      <h1 className="page-title">대회 개설</h1>

      <div className="sheet form-sheet mt-8">
        <div className="form-row">
          <label htmlFor="contest-title" className="form-label">제목</label>
          <div className="form-control">
            <input id="contest-title" value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="2학기 알고리즘 대회" />
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="contest-description" className="form-label">
            설명
            <small>비워 둘 수 있습니다.</small>
          </label>
          <div className="form-control">
            <textarea id="contest-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input" />
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="contest-start" className="form-label">시작</label>
          <div className="form-control">
            <input id="contest-start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input w-auto max-w-full" />
          </div>
        </div>
        <div className="form-row">
          <label htmlFor="contest-end" className="form-label">끝</label>
          <div className="form-control">
            <input id="contest-end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input w-auto max-w-full" />
          </div>
        </div>
      </div>

      <h2 className="section-title mt-12">낼 문제</h2>
      <p className="page-lead">고른 순서대로 A, B, C가 됩니다. 다시 누르면 빠집니다.</p>
      <div className="sheet-plain mt-5 max-h-80 overflow-y-auto">
        {problems.length === 0 ? (
          <p className="notice p-6">
            등록된 문제가 없습니다. <Link href="/admin/problems" className="text-link">문제를 먼저 등록</Link>해 주세요.
          </p>
        ) : (
          <ul>
            {problems.map((p) => {
              const order = selectedIds.indexOf(p.id);
              const selected = order !== -1;
              return (
                <li key={p.id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleProblem(p.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${selected ? "bg-tint font-bold" : "hover:bg-tint/50"}`}
                  >
                    <span className={`inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border-[1.5px] text-sm font-black ${selected ? "border-marker bg-marker text-paper" : "border-print"}`}>
                      {selected ? letter(order) : ""}
                    </span>
                    <span className="w-10 flex-none tabular-nums text-pencil">{p.id}</span>
                    <span className="min-w-0 truncate">{p.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button onClick={handleCreate} disabled={submitting} className="btn btn-fill">
          {submitting ? "여는 중" : "대회 개설"}
        </button>
        {error && <p role="alert" className="notice-error">{error}</p>}
        {created && <p role="status">{created}</p>}
      </div>

      <h2 className="section-title mt-16">개설한 대회</h2>
      <div className="sheet-plain mt-4 overflow-hidden">
        {existing.length === 0 ? (
          <p className="notice p-6">아직 개설한 대회가 없습니다.</p>
        ) : (
          <table className="sheet-table">
            <thead>
              <tr>
                <th>제목</th>
                <th>기간</th>
                <th className="w-28"><span className="sr-only">결과</span></th>
              </tr>
            </thead>
            <tbody>
              {existing.map((c) => (
                <tr key={c.id}>
                  <td className="font-bold">{c.title}</td>
                  <td className="text-sm text-pencil">{formatRange(c.start_time, c.end_time)}</td>
                  <td>
                    <Link href={`/admin/contests/${c.id}/results`} className="text-link whitespace-nowrap text-sm">
                      결과 보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

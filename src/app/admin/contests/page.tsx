"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useProblemEditorSupport } from "@/hooks/useProblemEditorSupport";
import AdminGate from "@/components/AdminGate";
import AdminTabs from "@/components/AdminTabs";
import ProblemEditor, { type SavedProblem } from "@/components/admin/ProblemEditor";
import { errorMessage } from "@/lib/errors";
import { formatRange } from "@/lib/format";
import { pickableProblems } from "@/lib/problem-label";

interface Problem {
  id: number;
  title: string;
  difficulty: number | null;
  contest_only?: boolean;
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
  const support = useProblemEditorSupport(isAdmin);

  const [problems, setProblems] = useState<Problem[]>([]);
  // 이미 어느 대회에 들어간 문제. 그런 대회 전용 문제는 다시 고르지 않는다.
  const [linkedIds, setLinkedIds] = useState<number[]>([]);
  // 대회 전용 문제를 만드는 편집기가 열려 있는지. DB에 contest_only 칸이 없으면(마이그레이션 전) 단추를 숨긴다.
  const [contestOnlyReady, setContestOnlyReady] = useState(false);
  const [creatingProblem, setCreatingProblem] = useState(false);
  const [problemMessage, setProblemMessage] = useState<string | null>(null);
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
      const [full, links, { data: contests }] = await Promise.all([
        supabase.from("problems").select("id, title, difficulty, contest_only").order("id"),
        supabase.from("contest_problems").select("problem_id"),
        supabase
          .from("contests")
          .select("id, title, start_time, end_time")
          .order("start_time", { ascending: false }),
      ]);
      const probs = full.error
        ? (await supabase.from("problems").select("id, title, difficulty").order("id")).data
        : full.data;
      setContestOnlyReady(!full.error);
      setProblems(probs || []);
      setLinkedIds((links.data ?? []).map((row) => row.problem_id as number));
      setExisting(contests || []);
    })();
  }, [isAdmin]);

  // 만든 대회 전용 문제는 목록에 넣고 바로 고른다(다음 글자).
  const handleProblemCreated = (problem: SavedProblem, message: string) => {
    setProblems((prev) => [...prev, { id: problem.id, title: problem.title, difficulty: problem.difficulty, contest_only: true }]);
    setSelectedIds((prev) => [...prev, problem.id]);
    setCreatingProblem(false);
    setProblemMessage(`${message} ${letter(selectedIds.length)}번으로 골랐습니다.`);
  };

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
    if (creatingProblem)
      return setError("만들던 대회 전용 문제를 저장하거나 닫은 뒤 개설해 주세요.");

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
      if (linkErr) {
        // 문제 연결이 실패하면 방금 만든 대회를 지워, 문제 없는 대회가 목록에 남지 않게 한다.
        const { error: undoErr } = await supabase.from("contests").delete().eq("id", contest.id);
        if (undoErr) {
          throw new Error(
            `문제를 연결하지 못했고, 먼저 만든 “${contest.title}” 대회도 지우지 못했습니다. ` +
            "DB에서 그 대회를 직접 지운 뒤 다시 개설해 주세요.",
          );
        }
        throw linkErr;
      }

      setExisting((prev) => [contest, ...prev]);
      setLinkedIds((prev) => [...prev, ...selectedIds]);
      setProblemMessage(null);
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

  const visibleProblems = pickableProblems(problems, linkedIds);

  return (
    <div className="page page-narrow">
      <AdminTabs />
      <h1 className="page-title">대회 개설</h1>

      <div className="mt-6">
        <div className="field">
          <label htmlFor="contest-title" className="field-label">제목</label>
          <input id="contest-title" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div className="field">
          <label htmlFor="contest-description" className="field-label">
            설명<span className="field-hint">선택</span>
          </label>
          <textarea id="contest-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input" />
        </div>
        <div className="field grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contest-start" className="field-label">시작</label>
            <input id="contest-start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="contest-end" className="field-label">종료</label>
            <input id="contest-end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      <h2 className="section-title mt-10">문제</h2>
      <p className="mt-1 text-sm text-muted">
        고른 순서대로 A, B, C가 됩니다. 대회 전용 문제는 대회 화면에서만 보이고, 대회가 끝나면 문제 목록에 다음 번호로 한꺼번에 등록됩니다.
      </p>
      <div className="box mt-3 max-h-80 overflow-y-auto">
        {visibleProblems.length === 0 ? (
          <p className="notice p-6">
            등록된 문제가 없습니다. <Link href="/admin/problems" className="text-link">문제를 먼저 등록</Link>해 주세요.
          </p>
        ) : (
          <ul>
            {visibleProblems.map((p) => {
              const order = selectedIds.indexOf(p.id);
              const selected = order !== -1;
              return (
                <li key={p.id} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleProblem(p.id)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${selected ? "bg-fill" : "hover:bg-fill"}`}
                  >
                    <input type="checkbox" readOnly tabIndex={-1} checked={selected} className="h-4 w-4 accent-(--accent)" aria-hidden="true" />
                    <span className="w-5 flex-none font-semibold">{selected ? letter(order) : ""}</span>
                    {p.contest_only ? (
                      <span className="chip h-6! flex-none px-2!">대회 전용</span>
                    ) : (
                      <span className="w-10 flex-none tabular-nums text-muted">{p.id}</span>
                    )}
                    <span className="min-w-0 truncate">{p.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {contestOnlyReady && (
        <div className="mt-3">
          {problemMessage && <p role="status" className="mb-2 text-sm">{problemMessage}</p>}
          {creatingProblem ? (
            <section aria-labelledby="contest-only-title" className="box p-5">
              <h3 id="contest-only-title" className="font-semibold">대회 전용 문제 만들기</h3>
              <p className="mt-1 mb-6 text-sm text-muted">
                저장하면 이 대회의 문제로 골라집니다. 대회가 끝나기 전에는 문제 목록과 추천에 나오지 않습니다.
              </p>
              <ProblemEditor
                editing={null}
                contestOnly
                support={support}
                onSaved={handleProblemCreated}
                onCancel={() => setCreatingProblem(false)}
              />
            </section>
          ) : (
            <button type="button" onClick={() => { setCreatingProblem(true); setProblemMessage(null); }} className="btn btn-sm btn-line">
              <Plus size={14} aria-hidden="true" />
              대회 전용 문제 만들기
            </button>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={handleCreate} disabled={submitting || creatingProblem} className="btn btn-fill">
          {submitting ? "개설 중…" : "대회 개설"}
        </button>
        {error && <p role="alert" className="notice-error">{error}</p>}
        {created && <p role="status">{created}</p>}
      </div>

      <h2 className="section-title mt-12">개설한 대회</h2>
      <div className="box mt-4 overflow-hidden">
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
                  <td className="text-sm text-muted">{formatRange(c.start_time, c.end_time)}</td>
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

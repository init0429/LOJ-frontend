"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useProblemEditorSupport } from "@/hooks/useProblemEditorSupport";
import AdminGate from "@/components/AdminGate";
import AdminTabs from "@/components/AdminTabs";
import { useDialog } from "@/components/DialogProvider";
import Difficulty from "@/components/Difficulty";
import ProblemEditor, { type EditingProblem, type SavedProblem, type TestCaseDraft } from "@/components/admin/ProblemEditor";
import { errorMessage } from "@/lib/errors";
import { problemLabel } from "@/lib/problem-label";
import type { SolvedacInfo } from "@/lib/problem-solvedac";
import { tierName } from "@/lib/solvedac-tier";

interface ProblemRow {
  id: number;
  title: string;
  difficulty: number | null;
  contest_only?: boolean;
  solvedac_tier?: number | null;
  boj_problem_id?: number | null;
  problem_tags?: { tag_key: string }[];
}

const infoOf = (row: ProblemRow): SolvedacInfo => ({
  bojId: row.boj_problem_id ? String(row.boj_problem_id) : "",
  tier: row.solvedac_tier ?? null,
  tags: (row.problem_tags ?? []).map((tag) => tag.tag_key),
});

// 마이그레이션 전이면 없는 칸을 빼고 다시 읽는다(대회 전용 표시 → solved.ac 칸 순으로).
const LIST_COLUMNS = [
  "id, title, difficulty, contest_only, solvedac_tier, boj_problem_id, problem_tags(tag_key)",
  "id, title, difficulty, solvedac_tier, boj_problem_id, problem_tags(tag_key)",
  "id, title, difficulty",
];

export default function AdminProblemsPage() {
  const { checking, isAdmin } = useIsAdmin();
  const ask = useDialog();
  const support = useProblemEditorSupport(isAdmin);
  const [existing, setExisting] = useState<ProblemRow[]>([]);
  const [functionIds, setFunctionIds] = useState<Set<number>>(new Set());

  // 고치는 중인 문제. null이면 새 문제 등록. 저장하거나 바꿀 때마다 편집기를 새로 그린다(editorKey).
  const [editing, setEditing] = useState<EditingProblem | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [listMessage, setListMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    (async () => {
      for (const columns of LIST_COLUMNS) {
        const { data, error } = await supabase.from("problems").select(columns).order("id", { ascending: false });
        if (!active) return;
        if (!error) {
          // 대회 전용 문제(임시 번호 10억대)는 공개 문제보다 위에 모아 둔다.
          const rows = (data ?? []) as unknown as ProblemRow[];
          setExisting([...rows.filter((row) => row.contest_only), ...rows.filter((row) => !row.contest_only)]);
          return;
        }
      }
    })();
    supabase
      .from("problems")
      .select("id")
      .not("signature", "is", null)
      .then(({ data }) => active && setFunctionIds(new Set((data ?? []).map((row) => row.id as number))));
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const resetEditor = (next: EditingProblem | null = null) => {
    setEditing(next);
    setEditorKey((key) => key + 1);
  };

  const startEdit = async (row: ProblemRow) => {
    if (editing && editing.id !== row.id && !(await ask({
      title: `${problemLabel(row)} 문제를 열까요?`,
      message: `${problemLabel({ id: editing.id, title: String(editing.data.title ?? ""), contest_only: Boolean(editing.data.contest_only) })} 문제에서 저장하지 않고 고친 내용은 사라집니다.`,
      confirmLabel: "열기",
      tone: "danger",
    }))) return;
    setOpeningId(row.id);
    setListMessage(null);
    const [problem, cases] = await Promise.all([
      supabase.from("problems").select("*").eq("id", row.id).single(),
      supabase.from("test_cases").select("id, input_data, expected_output, is_hidden").eq("problem_id", row.id).order("id"),
    ]);
    setOpeningId(null);
    if (problem.error || cases.error || !problem.data) {
      setListMessage({ ok: false, text: `${problemLabel(row)} 문제를 불러오지 못했습니다. 다시 눌러 주세요.` });
      return;
    }
    setSaved(null);
    resetEditor({
      id: row.id,
      data: problem.data,
      cases: (cases.data ?? []) as Required<TestCaseDraft>[],
      solvedac: infoOf(row),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaved = (row: SavedProblem, message: string) => {
    setExisting((prev) =>
      prev.some((item) => item.id === row.id)
        ? prev.map((item) => (item.id === row.id ? { ...item, ...row } : item))
        : [row, ...prev],
    );
    if (row.functional !== undefined) {
      setFunctionIds((prev) => {
        const next = new Set(prev);
        if (row.functional) next.add(row.id);
        else next.delete(row.id);
        return next;
      });
    }
    setSaved(message);
    resetEditor();
  };

  const handleDelete = async (row: ProblemRow) => {
    setListMessage(null);
    setDeletingId(row.id);
    // 제출 기록이나 대회에 쓰인 문제는 지우지 않는다(사람들의 기록과 대회 결과가 함께 사라지므로).
    const [subs, contests] = await Promise.all([
      supabase.from("submissions").select("id", { count: "exact", head: true }).eq("problem_id", row.id),
      supabase.from("contest_problems").select("contest_id", { count: "exact", head: true }).eq("problem_id", row.id),
    ]);
    if (subs.error || contests.error) {
      setDeletingId(null);
      return setListMessage({ ok: false, text: "지워도 되는지 확인하지 못했습니다. 다시 눌러 주세요." });
    }
    if (subs.count || contests.count) {
      setDeletingId(null);
      const reasons = [subs.count ? `제출 ${subs.count}개` : "", contests.count ? `대회 ${contests.count}곳` : ""].filter(Boolean).join(", ");
      return setListMessage({ ok: false, text: `${problemLabel(row)} 문제는 ${reasons}에 쓰여서 지울 수 없습니다. 내용을 고치려면 "수정"을 쓰세요.` });
    }
    if (!(await ask({
      title: `${problemLabel(row)} 문제를 지울까요?`,
      message: "문제와 테스트케이스를 모두 지웁니다. 되돌릴 수 없습니다.",
      confirmLabel: "지우기",
      tone: "danger",
    }))) {
      setDeletingId(null);
      return;
    }
    const { error: caseErr } = await supabase.from("test_cases").delete().eq("problem_id", row.id);
    const { error: problemErr } = caseErr ? { error: caseErr } : await supabase.from("problems").delete().eq("id", row.id);
    setDeletingId(null);
    if (problemErr) {
      return setListMessage({ ok: false, text: errorMessage(problemErr, `${problemLabel(row)} 문제를 지우지 못했습니다.`) });
    }
    setExisting((prev) => prev.filter((item) => item.id !== row.id));
    if (editing?.id === row.id) resetEditor();
    setListMessage({ ok: true, text: `${problemLabel(row)} 문제를 지웠습니다.` });
  };

  if (checking || !isAdmin) return <AdminGate checking={checking} isAdmin={isAdmin} />;

  const editingRow = editing && existing.find((row) => row.id === editing.id);
  const heading = !editing
    ? "문제 등록"
    : editingRow?.contest_only
      ? "대회 전용 문제 수정"
      : `${editing.id}번 문제 수정`;

  return (
    <div className="page page-narrow">
      <AdminTabs />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="page-title">{heading}</h1>
        {editing && (
          <button type="button" onClick={() => resetEditor()} className="btn btn-sm btn-line">
            수정 그만두고 새로 등록
          </button>
        )}
      </div>
      {editing && (
        <p className="page-lead text-sm">
          고친 내용은 앞으로의 채점에만 쓰입니다. 이미 끝난 제출의 판정은 바뀌지 않습니다.
        </p>
      )}
      {!editing && (
        <p className="page-lead text-sm">
          대회가 끝난 뒤에 공개할 문제는 대회 개설 화면에서 “대회 전용 문제”로 만드세요.
        </p>
      )}
      {saved && <p role="status" className="mt-3 text-sm">{saved}</p>}

      <div className="mt-6">
        <ProblemEditor
          key={editorKey}
          editing={editing}
          support={support}
          onSaved={handleSaved}
          onCancel={editing ? () => resetEditor() : undefined}
        />
      </div>

      <h2 className="section-title mt-12">등록된 문제</h2>
      {listMessage && (
        <p role={listMessage.ok ? "status" : "alert"} className={`mt-2 text-sm ${listMessage.ok ? "" : "notice-error"}`}>
          {listMessage.text}
        </p>
      )}
      <div className="mt-4">
        {existing.length === 0 ? (
          <p className="notice py-6">아직 등록된 문제가 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="w-16">번호</th>
                  <th>제목</th>
                  <th className="w-28">난이도</th>
                  {support.solvedacReady && <th className="w-36">solved.ac</th>}
                  <th className="w-36"><span className="sr-only">관리</span></th>
                </tr>
              </thead>
              <tbody>
                {existing.map((p) => (
                  <tr key={p.id} aria-current={editing?.id === p.id ? "true" : undefined}>
                    <td className="font-semibold tabular-nums">
                      {p.contest_only ? (
                        <span className="chip" title="대회가 끝나면 다음 번호로 공개됩니다">대회 전용</span>
                      ) : (
                        p.id
                      )}
                    </td>
                    <td>
                      {p.title}
                      {functionIds.has(p.id) && <span className="chip ml-2 align-middle">함수 구현</span>}
                    </td>
                    <td><Difficulty value={p.difficulty} /></td>
                    {support.solvedacReady && (
                      <td className="text-sm text-muted">
                        {p.solvedac_tier == null ? "—" : tierName(p.solvedac_tier)}
                        {(p.problem_tags?.length ?? 0) > 0 && ` · 태그 ${p.problem_tags?.length}`}
                      </td>
                    )}
                    <td className="py-1.5!">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void startEdit(p)}
                          disabled={openingId !== null}
                          aria-label={`${problemLabel(p)} 문제 수정`}
                          className="btn btn-sm btn-line"
                        >
                          {openingId === p.id && <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />}
                          {editing?.id === p.id ? "수정 중" : "수정"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(p)}
                          disabled={deletingId !== null}
                          aria-label={`${problemLabel(p)} 문제 삭제`}
                          className="btn btn-sm px-2 text-muted hover:bg-fill hover:text-bad"
                        >
                          {deletingId === p.id ? <LoaderCircle className="animate-spin" size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

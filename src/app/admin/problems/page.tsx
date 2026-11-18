"use client";

import { Fragment, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminGate from "@/components/AdminGate";
import AdminTabs from "@/components/AdminTabs";
import Difficulty from "@/components/Difficulty";
import SolvedacProblemFields from "@/components/SolvedacProblemFields";
import { DIFFICULTY_LEVELS, difficultyLabel } from "@/lib/difficulty";
import { errorMessage } from "@/lib/errors";
import {
  emptySolvedacInfo,
  hasSolvedacInfo,
  loadTags,
  saveProblemSolvedac,
  type SolvedacInfo,
} from "@/lib/problem-solvedac";
import { tierName } from "@/lib/solvedac-tier";
import { parseBojId, type Tag } from "@/lib/tag-search";

interface TestCaseDraft {
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
}

interface ProblemRow {
  id: number;
  title: string;
  difficulty: number | null;
  solvedac_tier?: number | null;
  boj_problem_id?: number | null;
  problem_tags?: { tag_key: string }[];
}

const infoOf = (row: ProblemRow): SolvedacInfo => ({
  bojId: row.boj_problem_id ? String(row.boj_problem_id) : "",
  tier: row.solvedac_tier ?? null,
  tags: (row.problem_tags ?? []).map((tag) => tag.tag_key),
});

/** BOJ 번호 칸이 비었으면 null, 숫자가 아니면 오류 문구를 돌려준다. */
function checkBojId(info: SolvedacInfo): { bojId: number | null; error: string | null } {
  if (info.bojId.trim() === "") return { bojId: null, error: null };
  const bojId = parseBojId(info.bojId);
  return bojId === null
    ? { bojId: null, error: "BOJ 문제 번호는 1 이상의 숫자로 적어 주세요." }
    : { bojId, error: null };
}

const emptyTestCase = (): TestCaseDraft => ({
  input_data: "",
  expected_output: "",
  is_hidden: false,
});

export default function AdminProblemsPage() {
  const { checking, isAdmin } = useIsAdmin();
  const [existing, setExisting] = useState<ProblemRow[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [inputDescription, setInputDescription] = useState("");
  const [outputDescription, setOutputDescription] = useState("");
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(128);
  const [difficulty, setDifficulty] = useState<number>(1);
  const [testCases, setTestCases] = useState<TestCaseDraft[]>([
    emptyTestCase(),
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  // solved.ac 태그·티어. DB에 그 칸이 아직 없으면(마이그레이션 전) false가 되고 관련 칸을 숨긴다.
  const [solvedacReady, setSolvedacReady] = useState<boolean | null>(null);
  const [solvedac, setSolvedac] = useState<SolvedacInfo>(emptySolvedacInfo);
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagReloads, setTagReloads] = useState(0);
  const [editing, setEditing] = useState<{ id: number; info: SolvedacInfo } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    const load = async () => {
      const full = await supabase
        .from("problems")
        .select("id, title, difficulty, solvedac_tier, boj_problem_id, problem_tags(tag_key)")
        .order("id", { ascending: false });
      if (!active) return;
      if (!full.error) {
        setSolvedacReady(true);
        setExisting((full.data as ProblemRow[]) || []);
        return;
      }
      const basic = await supabase.from("problems").select("id, title, difficulty").order("id", { ascending: false });
      if (!active) return;
      setSolvedacReady(false);
      setExisting(basic.data || []);
    };
    void load();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || !solvedacReady) return;
    let active = true;
    loadTags().then(
      (next) => {
        if (active) setTags(next);
      },
      () => {
        if (active) setTags([]);
      },
    );
    return () => {
      active = false;
    };
  }, [isAdmin, solvedacReady, tagReloads]);

  const updateTestCase = (idx: number, patch: Partial<TestCaseDraft>) => {
    setTestCases((prev) =>
      prev.map((tc, i) => (i === idx ? { ...tc, ...patch } : tc)),
    );
  };

  const addTestCase = () => setTestCases((prev) => [...prev, emptyTestCase()]);
  const removeTestCase = (idx: number) =>
    setTestCases((prev) => prev.filter((_, i) => i !== idx));

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setInputDescription("");
    setOutputDescription("");
    setTimeLimitMs(2000);
    setMemoryLimitMb(128);
    setDifficulty(1);
    setTestCases([emptyTestCase()]);
    setSolvedac(emptySolvedacInfo());
  };

  const handleCreate = async () => {
    setError(null);
    setCreated(null);

    if (!title.trim()) return setError("제목을 적어 주세요.");
    if (!description.trim()) return setError("문제 설명을 적어 주세요.");
    const boj = checkBojId(solvedac);
    if (boj.error) return setError(boj.error);
    const validCases = testCases;
    if (validCases.length === 0)
      return setError("테스트케이스가 하나 이상 있어야 합니다.");
    if (
      validCases.some((tc) => tc.input_data === "" && tc.expected_output === "") &&
      !window.confirm("입력과 출력이 모두 빈 테스트케이스가 있습니다. 그대로 등록할까요?")
    ) return;

    setSubmitting(true);
    try {
      const { data: problem, error: problemErr } = await supabase
        .from("problems")
        .insert({
          title: title.trim(),
          description: description.trim(),
          input_description: inputDescription.trim() || null,
          output_description: outputDescription.trim() || null,
          time_limit_ms: timeLimitMs,
          memory_limit_mb: memoryLimitMb,
          difficulty,
        })
        .select()
        .single();

      if (problemErr) throw problemErr;

      const rows = validCases.map((tc) => ({
        problem_id: problem.id,
        input_data: tc.input_data,
        expected_output: tc.expected_output,
        is_hidden: tc.is_hidden,
      }));

      const { error: tcErr } = await supabase.from("test_cases").insert(rows);
      if (tcErr) {
        // 두 번에 나눠 넣으므로, 테스트케이스가 실패하면 방금 만든 문제를 지워
        // 채점할 수 없는 빈 문제가 목록에 남지 않게 한다.
        const { error: undoErr } = await supabase.from("problems").delete().eq("id", problem.id);
        if (undoErr) {
          throw new Error(
            `테스트케이스를 저장하지 못했고, 먼저 만든 ${problem.id}번 문제도 지우지 못했습니다. ` +
            "DB에서 그 문제를 직접 지운 뒤 다시 등록해 주세요.",
          );
        }
        throw tcErr;
      }

      // solved.ac 정보는 따로 저장한다. 실패해도 문제는 이미 등록됐으니 목록에서 다시 편집하면 된다.
      let solvedacNote = "";
      const row: ProblemRow = { id: problem.id, title: problem.title, difficulty: problem.difficulty };
      if (solvedacReady && hasSolvedacInfo(solvedac)) {
        try {
          await saveProblemSolvedac(problem.id, solvedac, boj.bojId);
          row.solvedac_tier = solvedac.tier;
          row.boj_problem_id = boj.bojId;
          row.problem_tags = solvedac.tags.map((tag_key) => ({ tag_key }));
        } catch (err) {
          solvedacNote = ` 다만 solved.ac 정보는 저장하지 못했습니다(${errorMessage(err, "알 수 없는 오류")}). 아래 목록에서 다시 편집해 주세요.`;
        }
      }

      setExisting((prev) => [row, ...prev]);
      setCreated(`${problem.id}번 “${problem.title}” 문제를 등록했습니다.${solvedacNote}`);
      resetForm();
    } catch (err) {
      setError(errorMessage(err, "문제를 등록하지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    const boj = checkBojId(editing.info);
    if (boj.error) return setEditError(boj.error);
    setEditSaving(true);
    setEditError(null);
    try {
      await saveProblemSolvedac(editing.id, editing.info, boj.bojId);
      const { id, info } = editing;
      setExisting((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, solvedac_tier: info.tier, boj_problem_id: boj.bojId, problem_tags: info.tags.map((tag_key) => ({ tag_key })) }
            : row,
        ),
      );
      setEditing(null);
    } catch (err) {
      setEditError(errorMessage(err, "solved.ac 정보를 저장하지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setEditSaving(false);
    }
  };

  if (checking || !isAdmin) return <AdminGate checking={checking} isAdmin={isAdmin} />;

  return (
    <div className="page page-narrow">
      <AdminTabs />
      <h1 className="page-title">문제 등록</h1>

      <div className="mt-6">
        <div className="field">
          <label htmlFor="problem-title" className="field-label">제목</label>
          <input id="problem-title" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>
        <div className="field">
          <label htmlFor="problem-description" className="field-label">
            문제 설명<span className="field-hint">마크다운, $수식$</span>
          </label>
          <textarea id="problem-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={8} className="input input-code" />
        </div>
        <div className="field grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="problem-input" className="field-label">
              입력 설명<span className="field-hint">선택</span>
            </label>
            <textarea id="problem-input" value={inputDescription} onChange={(e) => setInputDescription(e.target.value)} rows={3} className="input input-code" />
          </div>
          <div>
            <label htmlFor="problem-output" className="field-label">
              출력 설명<span className="field-hint">선택</span>
            </label>
            <textarea id="problem-output" value={outputDescription} onChange={(e) => setOutputDescription(e.target.value)} rows={3} className="input input-code" />
          </div>
        </div>
        <div className="field grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="problem-time" className="field-label">시간 제한 (ms)</label>
            <input id="problem-time" type="number" min={100} step={100} value={timeLimitMs} onChange={(e) => setTimeLimitMs(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label htmlFor="problem-memory" className="field-label">메모리 제한 (MB)</label>
            <input id="problem-memory" type="number" min={16} step={16} value={memoryLimitMb} onChange={(e) => setMemoryLimitMb(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label htmlFor="problem-difficulty" className="field-label">난이도</label>
            <select id="problem-difficulty" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="input">
              {DIFFICULTY_LEVELS.map((level) => (
                <option key={level} value={level}>{difficultyLabel(level)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <h2 className="section-title mt-10">solved.ac 티어와 태그</h2>
      {solvedacReady === false ? (
        <p className="notice mt-2 text-sm">
          DB에 solved.ac 칸이 아직 없습니다. migrations/20261118_solvedac_tags.sql을 실행하면 여기서 고를 수 있습니다.
        </p>
      ) : (
        <div className="mt-3">
          <SolvedacProblemFields
            value={solvedac}
            onChange={setSolvedac}
            tags={tags}
            onTagsSynced={() => setTagReloads((count) => count + 1)}
          />
        </div>
      )}

      <h2 className="section-title mt-10">테스트케이스</h2>
      <p className="mt-1 text-sm text-muted">숨김으로 표시한 것은 채점에만 쓰이고 문제에는 보이지 않습니다.</p>
      <ol className="mt-3 space-y-3">
        {testCases.map((tc, idx) => (
          <li key={idx} className="box p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold tabular-nums">{idx + 1}번</span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={tc.is_hidden} onChange={(e) => updateTestCase(idx, { is_hidden: e.target.checked })} className="h-4 w-4 accent-(--accent)" />
                  숨김
                </label>
                {testCases.length > 1 && (
                  <button type="button" onClick={() => removeTestCase(idx)} aria-label={`${idx + 1}번 테스트케이스 삭제`} title="삭제" className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-fill hover:text-fg">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-muted">
                입력
                <textarea value={tc.input_data} onChange={(e) => updateTestCase(idx, { input_data: e.target.value })} rows={3} className="input input-code mt-1 font-normal" />
              </label>
              <label className="block text-sm text-muted">
                출력
                <textarea value={tc.expected_output} onChange={(e) => updateTestCase(idx, { expected_output: e.target.value })} rows={3} className="input input-code mt-1 font-normal" />
              </label>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={addTestCase} className="btn btn-sm btn-line mt-3">테스트케이스 추가</button>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={handleCreate} disabled={submitting} className="btn btn-fill">
          {submitting ? "등록 중…" : "문제 등록"}
        </button>
        {error && <p role="alert" className="notice-error">{error}</p>}
        {created && <p role="status">{created}</p>}
      </div>

      <h2 className="section-title mt-12">등록된 문제</h2>
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
                  {solvedacReady && <th className="w-44">solved.ac</th>}
                </tr>
              </thead>
              <tbody>
                {existing.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td className="font-semibold tabular-nums">{p.id}</td>
                      <td>{p.title}</td>
                      <td><Difficulty value={p.difficulty} /></td>
                      {solvedacReady && (
                        <td>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-muted">
                              {p.solvedac_tier == null ? "—" : tierName(p.solvedac_tier)}
                              {(p.problem_tags?.length ?? 0) > 0 && ` · 태그 ${p.problem_tags?.length}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditError(null);
                                setEditing(editing?.id === p.id ? null : { id: p.id, info: infoOf(p) });
                              }}
                              aria-expanded={editing?.id === p.id}
                              aria-label={`${p.id}번 solved.ac 정보 편집`}
                              className="btn btn-sm btn-line"
                            >
                              편집
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                    {editing?.id === p.id && (
                      <tr>
                        <td colSpan={4} className="bg-transparent! pb-6">
                          <div className="box p-4">
                            <SolvedacProblemFields
                              value={editing.info}
                              onChange={(info) => setEditing({ id: p.id, info })}
                              tags={tags}
                              onTagsSynced={() => setTagReloads((count) => count + 1)}
                            />
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button type="button" onClick={() => void saveEdit()} disabled={editSaving} className="btn btn-sm btn-fill">
                                {editSaving ? "저장하는 중" : "저장"}
                              </button>
                              <button type="button" onClick={() => setEditing(null)} disabled={editSaving} className="btn btn-sm btn-line">
                                취소
                              </button>
                              {editError && <p role="alert" className="notice-error text-sm">{editError}</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

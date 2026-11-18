"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminGate from "@/components/AdminGate";
import AdminTabs from "@/components/AdminTabs";
import Difficulty from "@/components/Difficulty";
import { DIFFICULTY_LEVELS, difficultyLabel } from "@/lib/difficulty";
import { errorMessage } from "@/lib/errors";

interface TestCaseDraft {
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
}

interface ProblemRow {
  id: number;
  title: string;
  difficulty: number | null;
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

  useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("problems")
      .select("id, title, difficulty")
      .order("id", { ascending: false })
      .then(({ data }) => setExisting(data || []));
  }, [isAdmin]);

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
  };

  const handleCreate = async () => {
    setError(null);
    setCreated(null);

    if (!title.trim()) return setError("제목을 적어 주세요.");
    if (!description.trim()) return setError("문제 설명을 적어 주세요.");
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

      setExisting((prev) => [
        {
          id: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
        },
        ...prev,
      ]);
      setCreated(`${problem.id}번 “${problem.title}” 문제를 등록했습니다.`);
      resetForm();
    } catch (err) {
      setError(errorMessage(err, "문제를 등록하지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setSubmitting(false);
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
      <div className="box mt-4 overflow-hidden">
        {existing.length === 0 ? (
          <p className="notice p-6">아직 등록된 문제가 없습니다.</p>
        ) : (
          <table className="sheet-table">
            <thead>
              <tr>
                <th className="w-20">번호</th>
                <th>제목</th>
                <th className="w-36">난이도</th>
              </tr>
            </thead>
            <tbody>
              {existing.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold tabular-nums">{p.id}</td>
                  <td>{p.title}</td>
                  <td><Difficulty value={p.difficulty} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

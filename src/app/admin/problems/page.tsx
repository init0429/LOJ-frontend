"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminGate from "@/components/AdminGate";
import AdminTabs from "@/components/AdminTabs";
import { useDialog } from "@/components/DialogProvider";
import Difficulty from "@/components/Difficulty";
import FunctionSignatureFields from "@/components/FunctionSignatureFields";
import { ExampleNotationHelper, FunctionCheck } from "@/components/FunctionTestTools";
import { Switch } from "@/components/SettingsShell";
import SolvedacProblemFields from "@/components/SolvedacProblemFields";
import { useSignaturePreview } from "@/hooks/useSignaturePreview";
import { DIFFICULTY_LEVELS, difficultyLabel } from "@/lib/difficulty";
import { errorMessage } from "@/lib/errors";
import { MAX_CHECKED_TESTS, MAX_CHECKED_TEXT, previewSignature } from "@/lib/function-api";
import {
  emptySolvedacInfo,
  hasSolvedacInfo,
  loadTags,
  saveProblemSolvedac,
  type SolvedacInfo,
} from "@/lib/problem-solvedac";
import {
  emptySignature,
  normalizeSignature,
  parseStoredSignature,
  type Signature,
} from "@/lib/signature";
import { tierName } from "@/lib/solvedac-tier";
import { parseBojId, type Tag } from "@/lib/tag-search";

interface TestCaseDraft {
  /** 이미 저장된 테스트케이스면 그 번호. 새로 추가한 것은 없다. */
  id?: number;
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
  const ask = useDialog();
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
  // 수정 중인 문제 번호. null이면 새 문제 등록. 수정을 시작할 때의 테스트케이스 번호도 기억한다(지운 것 찾기).
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalCaseIds, setOriginalCaseIds] = useState<number[]>([]);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [listMessage, setListMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // 함수 구현. DB에 signature 칸이 아직 없으면(마이그레이션 전) false가 되고 관련 칸을 숨긴다.
  const [functionReady, setFunctionReady] = useState<boolean | null>(null);
  const [functionIds, setFunctionIds] = useState<Set<number>>(new Set());
  const [functionEnabled, setFunctionEnabled] = useState(false);
  const [signature, setSignature] = useState<Signature>(emptySignature);
  const signatureState = useSignaturePreview(functionEnabled, signature, testCases);

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
    if (!isAdmin) return;
    let active = true;
    supabase
      .from("problems")
      .select("id")
      .not("signature", "is", null)
      .then(({ data, error: probeError }) => {
        if (!active) return;
        setFunctionReady(!probeError);
        setFunctionIds(new Set((data ?? []).map((row) => row.id as number)));
      });
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
    setFunctionEnabled(false);
    setSignature(emptySignature());
    setEditingId(null);
    setOriginalCaseIds([]);
  };

  /** 등록과 수정이 같이 쓰는 확인. 문제가 있으면 오류 문구를 띄우고 null을 돌려준다. */
  const validate = async (): Promise<{ bojId: number | null } | null> => {
    setError(null);
    setCreated(null);
    const fail = (message: string) => {
      setError(message);
      return null;
    };
    if (!title.trim()) return fail("제목을 적어 주세요.");
    if (!description.trim()) return fail("문제 설명을 적어 주세요.");
    const boj = checkBojId(solvedac);
    if (boj.error) return fail(boj.error);
    if (testCases.length === 0) return fail("테스트케이스가 하나 이상 있어야 합니다.");
    if (
      testCases.some((tc) => tc.input_data === "" && tc.expected_output === "") &&
      !(await ask({
        title: "빈 테스트케이스가 있습니다",
        message: "입력과 출력이 모두 빈 테스트케이스가 있습니다. 그대로 저장할까요?",
        confirmLabel: "그대로 저장",
      }))
    ) return null;
    return { bojId: boj.bojId };
  };

  /**
   * 저장할 시그니처. 함수 구현을 켰으면 백엔드에 한 번 더 검사를 맡기고 정리된 것을 쓴다.
   * undefined: DB에 칸이 없어 건드리지 않음, null: 함수 구현을 받지 않음. 저장을 멈출 때는 false
   */
  const resolveSignature = async (): Promise<Signature | null | undefined | false> => {
    if (!functionReady) return undefined;
    if (!functionEnabled) return null;
    const checked = testCases.filter((tc) => tc.input_data.length <= MAX_CHECKED_TEXT && tc.expected_output.length <= MAX_CHECKED_TEXT);
    try {
      const preview = await previewSignature(
        normalizeSignature(signature),
        checked.slice(0, MAX_CHECKED_TESTS).map((tc) => ({ input: tc.input_data, output: tc.expected_output })),
      );
      const failing = preview.tests.filter((test) => test.error).length;
      if (failing > 0 && !(await ask({
        title: "함수 구현으로 맞힐 수 없는 테스트가 있습니다",
        message: `테스트 ${failing}개가 시그니처와 맞지 않습니다(테스트 아래 빨간 글씨). 이대로 저장하면 함수 구현으로 낸 풀이는 그 테스트에서 틀립니다.`,
        confirmLabel: "그대로 저장",
        tone: "danger",
      }))) {
        return false;
      }
      return preview.signature;
    } catch (err) {
      setError(`함수 구현: ${errorMessage(err, "시그니처를 확인하지 못했습니다.")}`);
      return false;
    }
  };

  const problemFields = (savedSignature: Signature | null | undefined) => ({
    title: title.trim(),
    description: description.trim(),
    input_description: inputDescription.trim() || null,
    output_description: outputDescription.trim() || null,
    time_limit_ms: timeLimitMs,
    memory_limit_mb: memoryLimitMb,
    difficulty,
    ...(savedSignature !== undefined && { signature: savedSignature }),
  });

  const rememberFunction = (problemId: number, savedSignature: Signature | null | undefined) => {
    if (savedSignature === undefined) return;
    setFunctionIds((prev) => {
      const next = new Set(prev);
      if (savedSignature) next.add(problemId);
      else next.delete(problemId);
      return next;
    });
  };

  const startEdit = async (row: ProblemRow) => {
    if (editingId !== null && editingId !== row.id && !(await ask({
      title: `${row.id}번 문제를 열까요?`,
      message: `${editingId}번 문제에서 저장하지 않고 고친 내용은 사라집니다.`,
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
      setListMessage({ ok: false, text: `${row.id}번 문제를 불러오지 못했습니다. 다시 눌러 주세요.` });
      return;
    }
    const data = problem.data;
    setTitle(data.title ?? "");
    setDescription(data.description ?? "");
    setInputDescription(data.input_description ?? "");
    setOutputDescription(data.output_description ?? "");
    setTimeLimitMs(data.time_limit_ms ?? 2000);
    setMemoryLimitMb(data.memory_limit_mb ?? 128);
    setDifficulty(data.difficulty ?? 1);
    const loaded = (cases.data ?? []) as Required<TestCaseDraft>[];
    setTestCases(loaded.length ? loaded : [emptyTestCase()]);
    setOriginalCaseIds(loaded.map((tc) => tc.id));
    setSolvedac(infoOf(row));
    const stored = parseStoredSignature(data.signature);
    setFunctionEnabled(stored !== null);
    setSignature(stored ?? emptySignature());
    setEditingId(row.id);
    setError(null);
    setCreated(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdate = async (problemId: number, bojId: number | null, savedSignature: Signature | null | undefined) => {
    setSubmitting(true);
    try {
      const { error: problemErr } = await supabase.from("problems").update(problemFields(savedSignature)).eq("id", problemId);
      if (problemErr) throw problemErr;

      // 새 것 추가 → 있던 것 고치기 → 뺀 것 지우기 순서로 해서, 중간에 실패해도 채점할 테스트가 비지 않게 한다.
      const added = testCases.filter((tc) => tc.id === undefined);
      if (added.length) {
        const { error: addErr } = await supabase.from("test_cases").insert(
          added.map((tc) => ({ problem_id: problemId, input_data: tc.input_data, expected_output: tc.expected_output, is_hidden: tc.is_hidden })),
        );
        if (addErr) throw addErr;
      }
      for (const tc of testCases.filter((tc) => tc.id !== undefined)) {
        const { error: caseErr } = await supabase
          .from("test_cases")
          .update({ input_data: tc.input_data, expected_output: tc.expected_output, is_hidden: tc.is_hidden })
          .eq("id", tc.id!);
        if (caseErr) throw caseErr;
      }
      const kept = new Set(testCases.map((tc) => tc.id));
      const removed = originalCaseIds.filter((id) => !kept.has(id));
      if (removed.length) {
        const { error: removeErr } = await supabase.from("test_cases").delete().in("id", removed);
        if (removeErr) throw removeErr;
      }

      rememberFunction(problemId, savedSignature);
      if (solvedacReady) await saveProblemSolvedac(problemId, solvedac, bojId);

      const savedTitle = title.trim();
      setExisting((prev) =>
        prev.map((row) =>
          row.id === problemId
            ? {
                ...row,
                title: savedTitle,
                difficulty,
                ...(solvedacReady && {
                  solvedac_tier: solvedac.tier,
                  boj_problem_id: bojId,
                  problem_tags: solvedac.tags.map((tag_key) => ({ tag_key })),
                }),
              }
            : row,
        ),
      );
      resetForm();
      setCreated(`${problemId}번 “${savedTitle}” 문제를 고쳤습니다.`);
    } catch (err) {
      setError(errorMessage(err, "고친 내용을 저장하지 못했습니다. 일부만 저장됐을 수 있으니 다시 저장해 주세요."));
    } finally {
      setSubmitting(false);
    }
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
      return setListMessage({ ok: false, text: `${row.id}번 문제는 ${reasons}에 쓰여서 지울 수 없습니다. 내용을 고치려면 "수정"을 쓰세요.` });
    }
    if (!(await ask({
      title: `${row.id}번 문제를 지울까요?`,
      message: `“${row.title}” 문제와 테스트케이스를 모두 지웁니다. 되돌릴 수 없습니다.`,
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
      return setListMessage({ ok: false, text: errorMessage(problemErr, `${row.id}번 문제를 지우지 못했습니다.`) });
    }
    setExisting((prev) => prev.filter((item) => item.id !== row.id));
    if (editingId === row.id) resetForm();
    setListMessage({ ok: true, text: `${row.id}번 “${row.title}” 문제를 지웠습니다.` });
  };

  const handleSave = async () => {
    const checked = await validate();
    if (!checked) return;
    setSubmitting(true);
    const savedSignature = await resolveSignature();
    setSubmitting(false);
    if (savedSignature === false) return;
    if (editingId !== null) return handleUpdate(editingId, checked.bojId, savedSignature);
    return handleCreate(checked.bojId, savedSignature);
  };

  const handleCreate = async (bojId: number | null, savedSignature: Signature | null | undefined) => {
    const boj = { bojId };
    const validCases = testCases;
    setSubmitting(true);
    try {
      const { data: problem, error: problemErr } = await supabase
        .from("problems")
        .insert(problemFields(savedSignature))
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
      rememberFunction(problem.id, savedSignature);
      setCreated(`${problem.id}번 “${problem.title}” 문제를 등록했습니다.${solvedacNote}`);
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="page-title">{editingId === null ? "문제 등록" : `${editingId}번 문제 수정`}</h1>
        {editingId !== null && (
          <button type="button" onClick={resetForm} disabled={submitting} className="btn btn-sm btn-line">
            수정 그만두고 새로 등록
          </button>
        )}
      </div>
      {editingId !== null && (
        <p className="page-lead text-sm">
          고친 내용은 앞으로의 채점에만 쓰입니다. 이미 끝난 제출의 판정은 바뀌지 않습니다.
        </p>
      )}

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

      <h2 className="section-title mt-10">함수 구현</h2>
      {functionReady === false ? (
        <p className="notice mt-2 text-sm">
          DB에 함수 구현 칸이 아직 없습니다. migrations/20261119_function_problems.sql을 실행하면 여기서 정할 수 있습니다.
        </p>
      ) : (
        <div className="mt-3">
          <div className="flex items-start justify-between gap-6">
            <div>
              <label htmlFor="function-enabled" className="text-sm font-medium">함수 구현으로도 풀 수 있게 하기</label>
              <p className="mt-0.5 text-[13px] text-muted">
                켜면 푸는 사람이 전체 프로그램과 함수 구현(class Solution 등) 중에서 고릅니다. 테스트는 그대로 하나만 두고,
                함수 구현으로 내면 채점할 때 입력을 인자로 바꿔 함수를 부르고 반환값을 출력합니다.
              </p>
            </div>
            <Switch id="function-enabled" checked={functionEnabled} onChange={setFunctionEnabled} />
          </div>
          {functionEnabled && (
            <div className="mt-4">
              <FunctionSignatureFields value={signature} onChange={setSignature} state={signatureState} />
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer font-medium">테스트 입력·출력을 적는 규칙</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                  <li>인자를 순서대로 적습니다. 숫자·bool·문자는 공백이나 줄바꿈으로 나눈 값 하나, bool은 true/false.</li>
                  <li>문자열은 한 줄 통째로(공백 포함). 문자열은 늘 새 줄에서 시작합니다.</li>
                  <li>배열·리스트·ListNode는 개수 n 다음에 값 n개. 문자열 배열은 n 다음에 n줄.</li>
                  <li>2차원 배열은 행 수 r 다음에, 행마다 그 행의 길이 k와 값 k개.</li>
                  <li>TreeNode는 개수 n 다음에 레벨 순서 값 n개(빈 자리는 null). 예: 7 / 3 9 20 null null 15 7</li>
                  <li>답은 개수 없이: 배열은 공백으로 이은 한 줄, 2차원은 행마다 한 줄, 문자열 배열은 값마다 한 줄, 실수는 소수점 5자리, 트리는 끝의 null을 뺀 레벨 순서.</li>
                </ul>
              </details>
            </div>
          )}
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
            {functionEnabled && (
              <div className="mt-3 space-y-2">
                <FunctionCheck
                  check={signatureState.checks[idx]}
                  loading={signatureState.loading}
                  onUseNormalized={(output) => updateTestCase(idx, { expected_output: output })}
                />
                <ExampleNotationHelper
                  signature={normalizeSignature(signature)}
                  disabled={signatureState.incomplete || signatureState.error !== null}
                  onFill={({ input, output }) =>
                    updateTestCase(idx, { input_data: input, ...(output !== null && { expected_output: output }) })
                  }
                />
              </div>
            )}
          </li>
        ))}
      </ol>
      <button type="button" onClick={addTestCase} className="btn btn-sm btn-line mt-3">테스트케이스 추가</button>

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button onClick={() => void handleSave()} disabled={submitting} className="btn btn-fill">
          {editingId === null ? (submitting ? "등록 중…" : "문제 등록") : (submitting ? "저장하는 중…" : "고친 내용 저장")}
        </button>
        {editingId !== null && (
          <button type="button" onClick={resetForm} disabled={submitting} className="btn btn-line">취소</button>
        )}
        {error && <p role="alert" className="notice-error">{error}</p>}
        {created && <p role="status">{created}</p>}
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
                  {solvedacReady && <th className="w-36">solved.ac</th>}
                  <th className="w-36"><span className="sr-only">관리</span></th>
                </tr>
              </thead>
              <tbody>
                {existing.map((p) => (
                  <tr key={p.id} aria-current={editingId === p.id ? "true" : undefined}>
                    <td className="font-semibold tabular-nums">{p.id}</td>
                    <td>
                      {p.title}
                      {functionIds.has(p.id) && <span className="chip ml-2 align-middle">함수 구현</span>}
                    </td>
                    <td><Difficulty value={p.difficulty} /></td>
                    {solvedacReady && (
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
                          disabled={openingId !== null || submitting}
                          aria-label={`${p.id}번 문제 수정`}
                          className="btn btn-sm btn-line"
                        >
                          {openingId === p.id && <LoaderCircle className="animate-spin" size={14} aria-hidden="true" />}
                          {editingId === p.id ? "수정 중" : "수정"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(p)}
                          disabled={deletingId !== null || submitting}
                          aria-label={`${p.id}번 문제 삭제`}
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

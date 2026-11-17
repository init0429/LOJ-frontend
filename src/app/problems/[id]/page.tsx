"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { supabase } from "@/lib/supabase";
import { useSubmissionState } from "@/hooks/useSubmissionState";
import CodeEditor from "@/components/CodeEditor";
import LanguageSelect from "@/components/LanguageSelect";
import ProblemSheet from "@/components/ProblemSheet";
import SubmissionResult from "@/components/SubmissionResult";
import TestRunResult from "@/components/TestRunResult";
import ThemeToggle from "@/components/ThemeToggle";
import Verdict from "@/components/Verdict";
import { errorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import { submitCode, testCode } from "@/lib/judge-api";
import { LANGUAGE_LABELS, STARTER_CODE } from "@/lib/languages";
import type { Problem, Submission, TestCase, TestResult } from "@/lib/types";
import { isJudging } from "@/lib/verdict";

export default function ProblemWorkspace() {
  const params = useParams();
  return <ProblemWorkspaceContent key={String(params.id)} />;
}

function ProblemWorkspaceContent() {
  const params = useParams();
  const problemId = params.id as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [solvedBefore, setSolvedBefore] = useState(false);
  const [history, setHistory] = useState<Submission[]>([]);
  const [activeLeftTab, setActiveLeftTab] = useState<"description" | "history">("description");
  const [activeConsoleTab, setActiveConsoleTab] = useState<"run" | "submission">("run");

  const [code, setCode] = useState(STARTER_CODE["python"]);
  const [language, setLanguage] = useState("python");
  const drafts = useRef<Record<string, string>>({});
  const [mobilePane, setMobilePane] = useState<"description" | "code">("description");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const requestBusy = useRef(false);

  const handleLanguageChange = (newLanguage: string) => {
    drafts.current[language] = code;
    setCode(drafts.current[newLanguage] ?? STARTER_CODE[newLanguage] ?? "");
    setLanguage(newLanguage);
  };

  const [subId, setSubId] = useState<string | null>(null);
  const status = useSubmissionState(subId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const judging = subId !== null && isJudging(status);
  const justSolved = subId !== null && status === "Accepted";

  useEffect(() => {
    if (!problemId) return;
    let cancelled = false;
    const fetchProblem = async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("*")
        .eq("id", problemId)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setLoadError("문제를 불러오지 못했습니다. 주소가 맞는지 확인해 주세요.");
        return;
      }
      setLoadError(null);
      setProblem(data);

      const { data: testCasesData } = await supabase
        .from("test_cases")
        .select("*")
        .eq("problem_id", problemId)
        .eq("is_hidden", false)
        .order("id");
      if (!cancelled && testCasesData) setTestCases(testCasesData);

      // 예전에 맞힌 문제면 번호에 동그라미를 그려 둔다.
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      const { data: accepted } = await supabase
        .from("submissions")
        .select("id")
        .eq("problem_id", problemId)
        .eq("user_id", session.user.id)
        .eq("status", "Accepted")
        .limit(1);
      if (!cancelled && accepted?.length) setSolvedBefore(true);
    };
    fetchProblem();
    return () => { cancelled = true; };
  }, [problemId]);

  useEffect(() => {
    let cancelled = false;
    if (activeLeftTab === "history" && problemId) {
      const fetchHistory = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        setHistoryLoading(true);
        setHistoryError(null);
        if (!session) {
          setHistory([]);
          setHistoryError("로그인하면 내 제출을 볼 수 있습니다.");
          setHistoryLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from("submissions")
          .select("id, status, language, created_at")
          .eq("problem_id", problemId)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        setHistory(data ?? []);
        if (error) setHistoryError("제출 기록을 불러오지 못했습니다. 탭을 다시 눌러 주세요.");
        setHistoryLoading(false);
      };
      fetchHistory();
    }
    return () => { cancelled = true; };
  }, [activeLeftTab, problemId, status]);

  const handleSubmit = async () => {
    if (requestBusy.current || !code.trim()) return;
    requestBusy.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubId(null);
    setActiveConsoleTab("submission");
    setMobilePane("code");

    try {
      setSubId(await submitCode({
        problem_id: parseInt(problemId, 10),
        language,
        code,
      }));
    } catch (err) {
      setSubmitError(errorMessage(err, "제출하지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setIsSubmitting(false);
      requestBusy.current = false;
    }
  };

  const handleTest = async () => {
    if (requestBusy.current || !code.trim()) return;
    requestBusy.current = true;
    setIsTesting(true);
    setTestError(null);
    setActiveConsoleTab("run");
    setMobilePane("code");

    try {
      setTestResult(await testCode({
        problem_id: parseInt(problemId, 10),
        language,
        code,
      }));
    } catch (err) {
      setTestResult(null);
      setTestError(errorMessage(err, "예제를 실행하지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setIsTesting(false);
      requestBusy.current = false;
    }
  };

  if (loadError) {
    return (
      <div className="page page-narrow">
        <p role="alert" className="notice-error">{loadError}</p>
        <Link href="/problems" className="btn btn-line mt-6">문제 목록으로 돌아가기</Link>
      </div>
    );
  }

  if (!problem) {
    return <p role="status" className="notice page">문제를 불러오는 중…</p>;
  }

  const busy = isTesting || isSubmitting;

  return (
    <div className="problem-workspace flex h-dvh flex-col overflow-hidden" data-mobile-pane={mobilePane}>
      <header className="flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-[1.5px] border-print bg-paper px-3 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/problems" className="btn btn-sm btn-line pl-2.5">
            <ChevronLeft size={16} aria-hidden="true" />
            문제 목록
          </Link>
          <p className="truncate font-extrabold">
            <span className="mr-2 tabular-nums text-print-ink">{problem.id}</span>
            {problem.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={handleTest} disabled={busy || !code.trim()} className="btn btn-sm btn-line">
            {isTesting ? "실행하는 중" : "예제 실행"}
          </button>
          <button onClick={handleSubmit} disabled={busy || judging || !code.trim()} className="btn btn-sm btn-fill">
            {isSubmitting ? "제출하는 중" : judging ? "채점하는 중" : "제출"}
          </button>
        </div>
      </header>

      <div role="group" aria-label="보이는 영역" className="workspace-mobile-switch">
        <button className="choice" aria-pressed={mobilePane === "description"} onClick={() => setMobilePane("description")}>문제</button>
        <button className="choice" aria-pressed={mobilePane === "code"} onClick={() => setMobilePane("code")}>코드와 결과</button>
      </div>

      <div className="flex flex-1 overflow-hidden p-2">
        <PanelGroup orientation="horizontal" className="workspace-panels h-full w-full overflow-hidden">
          <Panel defaultSize="46%" minSize="25%" className="workspace-description sheet flex flex-col overflow-hidden">
            <div role="group" aria-label="문제지 보기" className="flex flex-none gap-1 border-b border-line px-3 py-1.5">
              <button className="choice choice-sm" aria-pressed={activeLeftTab === "description"} onClick={() => setActiveLeftTab("description")}>문제</button>
              <button className="choice choice-sm" aria-pressed={activeLeftTab === "history"} onClick={() => setActiveLeftTab("history")}>내 제출</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              {activeLeftTab === "description" && (
                <ProblemSheet
                  problem={problem}
                  examples={testCases}
                  mark={solvedBefore || justSolved ? "correct" : null}
                  drawMark={justSolved && !solvedBefore}
                />
              )}

              {activeLeftTab === "history" && (
                <section aria-labelledby="history-title">
                  <h2 id="history-title" className="section-title">내 제출</h2>
                  {historyLoading ? (
                    <p role="status" className="notice mt-4">제출 기록을 불러오는 중…</p>
                  ) : historyError ? (
                    <p role="alert" className="notice mt-4">{historyError}</p>
                  ) : history.length === 0 ? (
                    <p className="notice mt-4">아직 제출한 적이 없습니다. 코드를 쓰고 ‘제출’을 눌러 보세요.</p>
                  ) : (
                    <table className="sheet-table mt-4">
                      <thead>
                        <tr>
                          <th>결과</th>
                          <th>언어</th>
                          <th>제출한 때</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((sub) => (
                          <tr key={sub.id}>
                            <td className="py-2!"><Verdict status={sub.status} size="sm" /></td>
                            <td>{LANGUAGE_LABELS[sub.language] ?? sub.language}</td>
                            <td className="text-pencil">{formatDateTime(sub.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="workspace-divider" />

          <Panel defaultSize="54%" minSize="30%" className="workspace-code">
            <PanelGroup orientation="vertical">
              <Panel defaultSize="64%" minSize="25%" className="sheet-plain flex flex-col overflow-hidden">
                <div className="flex-none border-b border-line px-3 py-2">
                  <LanguageSelect value={language} onChange={handleLanguageChange} />
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor language={language} value={code} onChange={setCode} />
                </div>
              </Panel>

              <PanelResizeHandle className="workspace-divider workspace-divider-row" />

              <Panel defaultSize="36%" minSize="20%" className="sheet-plain flex flex-col overflow-hidden">
                <div role="group" aria-label="결과 보기" className="flex flex-none gap-1 border-b border-line px-3 py-1.5">
                  <button className="choice choice-sm" aria-pressed={activeConsoleTab === "run"} onClick={() => setActiveConsoleTab("run")}>실행 결과</button>
                  <button className="choice choice-sm" aria-pressed={activeConsoleTab === "submission"} onClick={() => setActiveConsoleTab("submission")}>채점 결과</button>
                </div>
                <div className="flex-1 overflow-auto p-5">
                  {activeConsoleTab === "run" && (
                    <TestRunResult running={isTesting} result={testResult} error={testError} />
                  )}
                  {activeConsoleTab === "submission" && (
                    <SubmissionResult
                      submitting={isSubmitting}
                      submitted={subId !== null}
                      status={status}
                      error={submitError}
                    />
                  )}
                </div>
              </Panel>
            </PanelGroup>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

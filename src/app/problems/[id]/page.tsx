"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Code, CloudUpload, FileText, History, List, Play, RotateCcw, SquareCheck, Terminal } from "lucide-react";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  usePanelRef,
} from "react-resizable-panels";
import { supabase } from "@/lib/supabase";
import { RUN_SHORTCUT, SUBMIT_SHORTCUT, useRunShortcuts } from "@/hooks/useRunShortcuts";
import { useSubmissionFeedback, useSubmissionState } from "@/hooks/useSubmissionState";
import CodeEditor from "@/components/CodeEditor";
import LanguageSelect from "@/components/LanguageSelect";
import Logo from "@/components/Logo";
import ProblemSheet from "@/components/ProblemSheet";
import SubmissionHistory from "@/components/SubmissionHistory";
import SubmissionResult from "@/components/SubmissionResult";
import TestRunResult from "@/components/TestRunResult";
import ThemeToggle from "@/components/ThemeToggle";
import { errorMessage } from "@/lib/errors";
import { loadDraft, loadLanguage, saveDraft, saveLanguage } from "@/lib/drafts";
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

  // 마지막에 고른 언어와 이 문제에서 쓰던 코드를 브라우저에서 이어 받는다.
  // (처음 그릴 때는 문제를 불러오는 중이라 편집기가 없으므로 서버 화면과 어긋나지 않는다.)
  const [language, setLanguage] = useState(loadLanguage);
  const [code, setCode] = useState(() => loadDraft(problemId, loadLanguage()));
  const consolePanel = usePanelRef();
  const [mobilePane, setMobilePane] = useState<"description" | "code">("description");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const requestBusy = useRef(false);

  const handleLanguageChange = (newLanguage: string) => {
    setCode(loadDraft(problemId, newLanguage));
    setLanguage(newLanguage);
    saveLanguage(newLanguage);
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    saveDraft(problemId, language, value);
  };

  const resetCode = () => {
    if (!window.confirm(`${LANGUAGE_LABELS[language] ?? language} 코드를 처음 상태로 되돌릴까요? 쓰던 코드는 사라집니다.`)) return;
    const starter = STARTER_CODE[language] ?? "";
    setCode(starter);
    saveDraft(problemId, language, starter);
  };

  const loadSubmissionCode = (submittedLanguage: string, submittedCode: string) => {
    const current = submittedLanguage === language ? code : loadDraft(problemId, submittedLanguage);
    const untouched = current === (STARTER_CODE[submittedLanguage] ?? "") || current === submittedCode;
    if (!untouched && !window.confirm("편집기의 코드를 이 제출의 코드로 바꿀까요? 지금 쓰던 코드는 사라집니다.")) return;
    setLanguage(submittedLanguage);
    setCode(submittedCode);
    saveLanguage(submittedLanguage);
    saveDraft(problemId, submittedLanguage, submittedCode);
    setMobilePane("code");
  };

  // 실행하거나 제출하면 결과 칸을 넉넉하게 연다. 직접 더 크게 해 두었으면 그대로 둔다.
  const showConsole = () => {
    const panel = consolePanel.current;
    if (panel && panel.getSize().asPercentage < 50) panel.resize("55%");
  };

  const [subId, setSubId] = useState<string | null>(null);
  const status = useSubmissionState(subId);
  const feedback = useSubmissionFeedback(subId, status);
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
    showConsole();

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
    showConsole();

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

  // 단축키도 버튼과 같은 조건에서만 동작한다(채점 중에는 다시 제출하지 않는다).
  const idle = !isTesting && !isSubmitting && problem !== null && code.trim() !== "";
  useRunShortcuts(
    () => { if (idle) void handleTest(); },
    () => { if (idle && !judging) void handleSubmit(); },
  );

  useEffect(() => {
    if (problem) document.title = `${problem.title} · LOJ`;
  }, [problem]);

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
    <div className="problem-workspace flex h-dvh flex-col overflow-hidden bg-workspace" data-mobile-pane={mobilePane}>
      <header className="relative flex flex-none flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/problems" className="px-1 text-lg" aria-label="LOJ 문제 목록">
            <Logo />
          </Link>
          <Link href="/problems" className="btn btn-sm gap-1.5 px-2 font-medium text-muted hover:bg-fill hover:text-fg">
            <List size={16} aria-hidden="true" />
            문제 목록
          </Link>
        </div>
        <div className="btn-group md:absolute md:left-1/2 md:-translate-x-1/2">
          <button onClick={handleTest} disabled={busy || !code.trim()} title={`예제 실행 (${RUN_SHORTCUT.label})`} aria-keyshortcuts={RUN_SHORTCUT.aria} className="btn btn-sm btn-line">
            <Play size={13} fill="currentColor" aria-hidden="true" />
            {isTesting ? "실행하는 중" : "예제 실행"}
          </button>
          <button onClick={handleSubmit} disabled={busy || judging || !code.trim()} title={`제출 (${SUBMIT_SHORTCUT.label})`} aria-keyshortcuts={SUBMIT_SHORTCUT.aria} className="btn btn-sm btn-submit">
            <CloudUpload size={15} aria-hidden="true" />
            {isSubmitting ? "제출하는 중" : judging ? "채점하는 중" : "제출"}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </header>

      <div role="group" aria-label="보이는 영역" className="workspace-mobile-switch">
        <button className="tab" aria-pressed={mobilePane === "description"} onClick={() => setMobilePane("description")}>문제</button>
        <button className="tab" aria-pressed={mobilePane === "code"} onClick={() => setMobilePane("code")}>코드와 결과</button>
      </div>

      <div className="flex flex-1 overflow-hidden px-2 pb-2">
        <PanelGroup orientation="horizontal" className="workspace-panels h-full w-full overflow-hidden">
          <Panel defaultSize="46%" minSize="25%" className="workspace-description box flex flex-col overflow-hidden">
            <div role="group" aria-label="문제지 보기" className="panel-head">
              <button className="panel-tab" aria-pressed={activeLeftTab === "description"} onClick={() => setActiveLeftTab("description")}>
                <FileText size={14} className="text-accent" aria-hidden="true" />
                문제
              </button>
              <span className="panel-tab-gap" aria-hidden="true" />
              <button className="panel-tab" aria-pressed={activeLeftTab === "history"} onClick={() => setActiveLeftTab("history")}>
                <History size={14} className="text-accent" aria-hidden="true" />
                내 제출
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {activeLeftTab === "description" && (
                <ProblemSheet
                  problem={problem}
                  examples={testCases}
                  solved={solvedBefore || justSolved}
                  withTags
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
                    <SubmissionHistory history={history} onLoadCode={loadSubmissionCode} />
                  )}
                </section>
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="workspace-divider" />

          <Panel defaultSize="54%" minSize="30%" className="workspace-code">
            <PanelGroup orientation="vertical">
              <Panel defaultSize="64%" minSize="25%" className="box flex flex-col overflow-hidden">
                <div className="panel-head">
                  <p className="flex items-center gap-1.5 px-2 text-[13px] font-semibold">
                    <Code size={14} className="text-ok" aria-hidden="true" />
                    코드
                  </p>
                </div>
                <div className="flex flex-none items-center justify-between gap-2 border-b border-line px-1.5 py-1">
                  <LanguageSelect value={language} onChange={handleLanguageChange} />
                  <button
                    type="button"
                    onClick={resetCode}
                    title="처음 코드로 되돌리기"
                    aria-label="처음 코드로 되돌리기"
                    className="inline-flex size-7 flex-none items-center justify-center rounded-md text-muted hover:bg-fill hover:text-fg"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                  </button>
                </div>
                <div className="min-h-0 flex-1">
                  <CodeEditor language={language} value={code} onChange={handleCodeChange} />
                </div>
              </Panel>

              <PanelResizeHandle className="workspace-divider workspace-divider-row" />

              <Panel panelRef={consolePanel} defaultSize="36%" minSize="20%" className="box flex flex-col overflow-hidden">
                <div role="group" aria-label="결과 보기" className="panel-head">
                  <button className="panel-tab" aria-pressed={activeConsoleTab === "run"} onClick={() => setActiveConsoleTab("run")}>
                    <SquareCheck size={14} className="text-ok" aria-hidden="true" />
                    실행 결과
                  </button>
                  <span className="panel-tab-gap" aria-hidden="true" />
                  <button className="panel-tab" aria-pressed={activeConsoleTab === "submission"} onClick={() => setActiveConsoleTab("submission")}>
                    <Terminal size={14} className="text-ok" aria-hidden="true" />
                    채점 결과
                  </button>
                </div>
                <div className="flex-1 overflow-auto px-5 py-4">
                  {activeConsoleTab === "run" && (
                    <TestRunResult running={isTesting} result={testResult} error={testError} />
                  )}
                  {activeConsoleTab === "submission" && (
                    <SubmissionResult
                      submitting={isSubmitting}
                      submitted={subId !== null}
                      status={status}
                      feedback={feedback}
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

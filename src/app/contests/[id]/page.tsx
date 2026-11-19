"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Code, CloudUpload, FileText, Play, SquareCheck, Terminal, Timer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RUN_SHORTCUT, SUBMIT_SHORTCUT, useRunShortcuts } from "@/hooks/useRunShortcuts";
import { useSubmissionFeedback, useSubmissionState } from "@/hooks/useSubmissionState";
import CodeEditor from "@/components/CodeEditor";
import CodeModeToggle from "@/components/CodeModeToggle";
import { useDialog } from "@/components/DialogProvider";
import ContestStandings from "@/components/ContestStandings";
import LanguageSelect from "@/components/LanguageSelect";
import Logo from "@/components/Logo";
import ProblemNumber from "@/components/ProblemNumber";
import ProblemSheet from "@/components/ProblemSheet";
import SubmissionResult from "@/components/SubmissionResult";
import TestRunResult from "@/components/TestRunResult";
import ThemeToggle from "@/components/ThemeToggle";
import {
  CODE_MODE_LABELS,
  exampleViews,
  isCodeMode,
  isUntouchedStarter,
  languageFor,
  loadFunctionTemplates,
  modeLanguages,
  starterCode,
  type CodeMode,
  type FunctionTemplates,
} from "@/lib/code-mode";
import { loadLanguage, saveLanguage } from "@/lib/drafts";
import { errorMessage } from "@/lib/errors";
import { formatCountdown, formatDateTime } from "@/lib/format";
import { submitCode, testCode } from "@/lib/judge-api";
import { parsePreferences, readPreferencesRaw } from "@/lib/preferences";
import type { Contest, Problem, TestCase, TestResult } from "@/lib/types";
import { isJudging } from "@/lib/verdict";

type Phase = "upcoming" | "ongoing" | "ended";

function getPhase(start: string, end: string, now: number): Phase {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (now < s) return "upcoming";
  if (now >= e) return "ended";
  return "ongoing";
}

// 대회 문제는 출제 순서대로 A, B, C…로 부른다.
const letter = (index: number) => String.fromCharCode(65 + (index % 26));

export default function ContestWorkspace() {
  const params = useParams();
  const contestId = params.id as string;

  const [contest, setContest] = useState<Contest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set());
  const [activeIdx, setActiveIdx] = useState(0);
  const [now, setNow] = useState(0);

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  // 함수 구현을 받는 문제면 그 시작 코드. 형식은 임시 저장과 함께 서버(contest_drafts.mode)에 남긴다.
  const [mode, setMode] = useState<CodeMode>("program");
  const [templates, setTemplates] = useState<FunctionTemplates | null>(null);
  const [templatesFailed, setTemplatesFailed] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const ask = useDialog();
  // 뒤로 가기를 여러 번 눌러도 안내 창은 하나만 띄운다.
  const leaveNoticeOpen = useRef(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const [subId, setSubId] = useState<string | null>(null);
  const status = useSubmissionState(subId);
  const feedback = useSubmissionFeedback(subId, status);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState<"run" | "submission">("run");

  const [loadedProblemId, setLoadedProblemId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const currentProblem = problems[activeIdx];
  const currentProblemId = currentProblem?.id;
  const draftReady = currentProblemId !== undefined && loadedProblemId === currentProblemId;

  const judging = subId !== null && isJudging(status);
  const justSolved = subId !== null && status === "Accepted";

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!contestId) return;
    let cancelled = false;
    (async () => {
      const { data: contestData, error } = await supabase
        .from("contests")
        .select("*")
        .eq("id", contestId)
        .single();
      if (cancelled) return;
      if (error || !contestData) {
        setLoadError("대회를 불러오지 못했습니다. 주소가 맞는지 확인해 주세요.");
        return;
      }
      setNow(Date.now());
      setContest(contestData);
    })();
    return () => { cancelled = true; };
  }, [contestId]);

  // 문제는 대회가 시작한 뒤에만 받아 온다. 시작 전 조회는 DB 정책(RLS)이 막고, 화면도 요청하지 않는다.
  // 끝난 대회는 문제 목록과 최종 순위를 보여 준다.
  const currentPhase = contest !== null ? getPhase(contest.start_time, contest.end_time, now) : null;
  const ongoing = currentPhase === "ongoing";
  const started = currentPhase === "ongoing" || currentPhase === "ended";

  useEffect(() => {
    if (!contestId || !started) return;
    let cancelled = false;
    (async () => {
      const { data: cp, error: problemsError } = await supabase
        .from("contest_problems")
        .select("order, problems(*)")
        .eq("contest_id", contestId)
        .order("order", { ascending: true })
        .returns<{ order: number; problems: Problem | null }[]>();

      if (cancelled) return;
      if (problemsError) {
        setLoadError("대회 문제를 불러오지 못했습니다. 새로고침해 주세요.");
        return;
      }
      setProblems((cp || []).flatMap((row) => row.problems ? [row.problems] : []));

      // 이 대회에서 이미 맞힌 문제는 탭 글자에 동그라미를 그려 둔다.
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled || !session) return;
      const { data: accepted } = await supabase
        .from("submissions")
        .select("problem_id")
        .eq("contest_id", contestId)
        .eq("user_id", session.user.id)
        .eq("status", "Accepted");
      if (!cancelled && accepted) setSolvedIds(new Set(accepted.map((row) => row.problem_id)));
    })();
    return () => { cancelled = true; };
  }, [contestId, started]);

  useEffect(() => {
    if (currentProblem === undefined || !ongoing) return;
    const currentProblemId = currentProblem.id;
    let cancelled = false;

    (async () => {
      const [{ data: tcs }, functions] = await Promise.all([
        supabase
          .from("test_cases")
          .select("*")
          .eq("problem_id", currentProblemId)
          .eq("is_hidden", false)
          .order("id"),
        loadFunctionTemplates(currentProblem),
      ]);
      if (cancelled) return;
      setTestCases(tcs || []);
      setTemplates(functions.templates);
      setTemplatesFailed(functions.failed);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setLoadError("대회에 참가하려면 먼저 로그인해 주세요.");
        return;
      }

      const { data: draft, error } = await supabase
        .from("contest_drafts")
        .select("code, language, mode")
        .eq("contest_id", contestId)
        .eq("problem_id", currentProblemId)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        setLoadError("저장해 둔 코드를 불러오지 못했습니다. 새로고침해 주세요.");
        return;
      }
      if (draft) {
        setCode(draft.code);
        setLanguage(draft.language);
        setMode(functions.templates && isCodeMode(draft.mode) ? draft.mode : "program");
      } else {
        // 처음 여는 문제는 기본 형식과 마지막에 고른 언어의 시작 코드로 연다.
        const openedMode: CodeMode = functions.templates ? parsePreferences(readPreferencesRaw()).codeMode : "program";
        const preferred = languageFor(openedMode, functions.templates, loadLanguage());
        setMode(openedMode);
        setLanguage(preferred);
        setCode(starterCode(preferred, openedMode, functions.templates));
      }
      setLoadedProblemId(currentProblemId);
      setDirty(false);
      setSaveState("idle");
      setSubId(null);
      setSubmitError(null);
      setTestResult(null);
      setTestError(null);
    })();
    return () => { cancelled = true; };
  }, [currentProblem, contestId, ongoing]);

  useEffect(() => {
    if (!draftReady || !dirty) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setSaveState("error");
        return;
      }
      const { error } = await supabase.from("contest_drafts").upsert({
        contest_id: Number(contestId),
        problem_id: currentProblemId,
        user_id: session.user.id,
        code,
        language,
        mode,
        updated_at: new Date().toISOString(),
      });
      if (cancelled) return;
      setSaveState(error ? "error" : "saved");
      if (!error) setDirty(false);
    }, 1200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, language, mode, contestId, currentProblemId, draftReady, dirty, saveAttempt]);

  // 방금 맞힌 문제는 다른 문제로 넘어간 뒤에도 탭에 동그라미가 남아야 한다.
  if (justSolved && currentProblemId !== undefined && !solvedIds.has(currentProblemId)) {
    setSolvedIds(new Set(solvedIds).add(currentProblemId));
  }

  const updateCode = (value: string) => {
    if (!draftReady || value === code) return;
    setCode(value);
    setDirty(true);
    setSaveState("saving");
  };

  const phase: Phase | null = contest
    ? getPhase(contest.start_time, contest.end_time, now)
    : null;

  useEffect(() => {
    if (phase !== "ongoing" && !dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase, dirty]);

  useEffect(() => {
    if (phase !== "ongoing") return;
    history.pushState(null, "", location.href);
    const onPopState = () => {
      history.pushState(null, "", location.href);
      if (leaveNoticeOpen.current) return;
      leaveNoticeOpen.current = true;
      void ask({
        title: "대회 중에는 이 화면을 벗어날 수 없습니다",
        message: "쓰던 코드는 자동으로 저장됩니다. 대회가 끝나면 다른 화면으로 갈 수 있습니다.",
        cancelLabel: null,
      }).finally(() => {
        leaveNoticeOpen.current = false;
      });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [phase, ask]);

  const handleTest = async () => {
    if (!currentProblem || !draftReady || phase !== "ongoing") return;
    setIsTesting(true);
    setTestError(null);
    setActiveConsoleTab("run");
    try {
      setTestResult(await testCode({
        problem_id: currentProblem.id,
        language,
        code,
        contest_id: Number(contestId),
        ...(mode === "function" && { mode }),
      }));
    } catch (err) {
      setTestResult(null);
      setTestError(errorMessage(err, "예제를 실행하지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentProblem || !draftReady || phase !== "ongoing") return;
    setIsSubmitting(true);
    setSubmitError(null);
    setSubId(null);
    setActiveConsoleTab("submission");
    try {
      setSubId(await submitCode({
        problem_id: currentProblem.id,
        language,
        code,
        contest_id: Number(contestId),
        ...(mode === "function" && { mode }),
      }));
    } catch (err) {
      setSubmitError(errorMessage(err, "제출하지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const shortcutReady = phase === "ongoing" && draftReady && !isTesting && !isSubmitting;
  useRunShortcuts(
    () => { if (shortcutReady) void handleTest(); },
    () => { if (shortcutReady && !judging) void handleSubmit(); },
  );

  useEffect(() => {
    if (contest) document.title = `${contest.title} · LOJ`;
  }, [contest]);

  if (loadError) {
    return (
      <div className="page page-narrow">
        <p role="alert" className="notice-error">{loadError}</p>
        <Link href="/contests" className="btn btn-line mt-6">대회 목록으로 돌아가기</Link>
      </div>
    );
  }

  if (!contest) {
    return <p role="status" className="notice page">대회를 불러오는 중…</p>;
  }

  if (phase === "upcoming") {
    return (
      <div className="page page-narrow">
        <h1 className="page-title">{contest.title}</h1>
        <p className="page-lead">{formatDateTime(contest.start_time)} 시작</p>
        <p className="mt-6">
          시작까지{" "}
          <span role="timer" className="text-lg font-semibold tabular-nums">
            {formatCountdown(new Date(contest.start_time).getTime() - now)}
          </span>
        </p>
        <Link href="/contests" className="btn btn-line mt-6">대회 목록</Link>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="page">
        <Link href="/contests" className="btn btn-sm gap-1 px-2 font-medium text-muted hover:bg-fill hover:text-fg">
          ← 대회 목록
        </Link>
        <h1 className="page-title mt-4">{contest.title}</h1>
        <p className="page-lead">{formatDateTime(contest.end_time)}에 끝난 대회입니다. 문제는 지금도 풀어 볼 수 있습니다.</p>

        <section className="mt-8" aria-labelledby="ended-problems">
          <h2 id="ended-problems" className="section-title">문제</h2>
          {problems.length === 0 ? (
            <p className="notice mt-3">문제를 불러오는 중이거나 문제가 없습니다.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {problems.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/problems/${p.id}`} className="box flex items-center gap-3 px-4 py-3 hover:bg-fill">
                    <span className="font-semibold"><ProblemNumber id={letter(i)} solved={solvedIds.has(p.id)} /></span>
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    <span className="text-sm text-muted">풀어 보기 →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10" aria-labelledby="ended-standings">
          <h2 id="ended-standings" className="section-title">최종 순위</h2>
          {problems.length > 0 && (
            <ContestStandings contestId={contest.id} problemIds={problems.map((p) => p.id)} startTime={contest.start_time} />
          )}
        </section>
      </div>
    );
  }

  const busy = isTesting || isSubmitting;

  return (
    <div className="flex min-h-dvh flex-col bg-workspace lg:h-dvh lg:overflow-hidden">
      <header className="flex flex-none flex-wrap items-center justify-between gap-x-6 gap-y-2 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="px-1 text-lg"><Logo /></span>
          <p className="truncate font-semibold">{contest.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <span role="status" className="text-sm text-muted">
            {saveState === "error" ? (
              <button className="text-link" onClick={() => { setSaveState("saving"); setSaveAttempt((value) => value + 1); }}>
                저장하지 못했습니다. 다시 저장
              </button>
            ) : saveState === "saving" ? "저장하는 중" : saveState === "saved" ? "저장됨" : ""}
          </span>
          <p className="chip h-8 gap-2 px-3 text-sm">
            <Timer size={15} aria-hidden="true" />
            <span className="sr-only">남은 시간</span>
            <span role="timer" className="font-semibold text-fg tabular-nums">
              {formatCountdown(new Date(contest.end_time).getTime() - now)}
            </span>
          </p>
          <ThemeToggle />
        </div>
      </header>

      {problems.length > 1 && (
        <nav aria-label="대회 문제" className="flex flex-none gap-1 overflow-x-auto px-2 pb-2">
          {problems.map((p, i) => (
            <button
              key={p.id}
              disabled={dirty || busy}
              aria-pressed={i === activeIdx}
              title={dirty ? "코드가 저장된 뒤에 다른 문제로 넘어갈 수 있습니다." : undefined}
              onClick={() => setActiveIdx(i)}
              className="chip max-w-[16em] gap-1.5"
            >
              <span className="font-semibold"><ProblemNumber id={letter(i)} solved={solvedIds.has(p.id)} /></span>
              <span className="truncate">{p.title}</span>
            </button>
          ))}
        </nav>
      )}

      {problems.length === 0 ? (
        <p className="notice page">이 대회에는 아직 문제가 없습니다.</p>
      ) : (
        <div className="grid flex-1 gap-2 px-2 pb-2 lg:min-h-0 lg:grid-cols-2">
          <div className="box flex flex-col overflow-hidden">
            <div className="panel-head">
              <p className="flex items-center gap-1.5 px-2 text-[13px] font-semibold">
                <FileText size={14} className="text-accent" aria-hidden="true" />
                문제
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {currentProblem && (
                <ProblemSheet
                  problem={currentProblem}
                  examples={testCases}
                  exampleViews={mode === "function" ? exampleViews(templates) : undefined}
                  number={letter(activeIdx)}
                  solved={solvedIds.has(currentProblem.id) || justSolved}
                />
              )}
            </div>
          </div>

          <div className="flex min-h-[80dvh] flex-col gap-2 lg:min-h-0">
            <div className="box flex min-h-0 flex-[3] flex-col overflow-hidden">
              <div className="panel-head justify-between">
                <p className="flex items-center gap-1.5 px-2 text-[13px] font-semibold">
                  <Code size={14} className="text-ok" aria-hidden="true" />
                  코드
                </p>
                <div className="btn-group">
                  <button onClick={handleTest} disabled={busy || !draftReady} title={`예제 실행 (${RUN_SHORTCUT.label})`} aria-keyshortcuts={RUN_SHORTCUT.aria} className="btn btn-sm btn-line">
                    <Play size={13} fill="currentColor" aria-hidden="true" />
                    {isTesting ? "실행하는 중" : "예제 실행"}
                  </button>
                  <button onClick={handleSubmit} disabled={busy || judging || !draftReady} title={`제출 (${SUBMIT_SHORTCUT.label})`} aria-keyshortcuts={SUBMIT_SHORTCUT.aria} className="btn btn-sm btn-submit">
                    <CloudUpload size={15} aria-hidden="true" />
                    {isSubmitting ? "제출하는 중" : judging ? "채점하는 중" : "제출"}
                  </button>
                </div>
              </div>
              <div className="flex flex-none flex-wrap items-center gap-x-2 gap-y-1 border-b border-line px-1.5 py-1">
                {templates && (
                  <CodeModeToggle
                    value={mode}
                    disabled={!draftReady || busy}
                    onChange={async (next) => {
                      if (next === mode) return;
                      // 대회 화면은 문제마다 코드를 하나만 저장하므로, 형식을 바꾸면 그 형식의 시작 코드로 바꾼다.
                      if (!isUntouchedStarter(code, templates) && !(await ask({
                        title: `${CODE_MODE_LABELS[next]}으로 바꿀까요?`,
                        message: "이 문제의 코드는 하나만 저장되므로, 지금 코드 대신 시작 코드가 들어갑니다. 쓰던 코드는 사라집니다.",
                        confirmLabel: "바꾸기",
                        tone: "danger",
                      }))) return;
                      const nextLanguage = languageFor(next, templates, language);
                      setMode(next);
                      setLanguage(nextLanguage);
                      setCode(starterCode(nextLanguage, next, templates));
                      setDirty(true);
                      setSaveState("saving");
                    }}
                  />
                )}
                <LanguageSelect
                  value={language}
                  disabled={!draftReady}
                  languages={modeLanguages(mode, templates)}
                  onChange={(next) => {
                    if (isUntouchedStarter(code, templates)) setCode(starterCode(next, mode, templates));
                    setLanguage(next);
                    saveLanguage(next);
                    setDirty(true);
                    setSaveState("saving");
                  }}
                />
                {templatesFailed && (
                  <p className="notice text-xs">함수 구현 시작 코드를 받지 못해 전체 프로그램만 쓸 수 있습니다.</p>
                )}
              </div>
              <div className="min-h-0 flex-1">
                <CodeEditor language={language} value={code} onChange={updateCode} readOnly={!draftReady} />
              </div>
            </div>

            <div className="box flex min-h-0 flex-[2] flex-col overflow-hidden">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

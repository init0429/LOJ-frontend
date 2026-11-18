"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSubmissionFeedback, useSubmissionState } from "@/hooks/useSubmissionState";
import CodeEditor from "@/components/CodeEditor";
import LanguageSelect from "@/components/LanguageSelect";
import Logo from "@/components/Logo";
import ProblemNumber from "@/components/ProblemNumber";
import ProblemSheet from "@/components/ProblemSheet";
import SubmissionResult from "@/components/SubmissionResult";
import TestRunResult from "@/components/TestRunResult";
import ThemeToggle from "@/components/ThemeToggle";
import { errorMessage } from "@/lib/errors";
import { formatCountdown, formatDateTime } from "@/lib/format";
import { submitCode, testCode } from "@/lib/judge-api";
import { STARTER_CODE } from "@/lib/languages";
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
  const [testCases, setTestCases] = useState<TestCase[]>([]);
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

  // 문제는 대회가 진행 중일 때만 받아 온다. 시작 전에 받아 두면 화면에는 안 보여도
  // 개발자 도구의 네트워크 기록에서 문제를 미리 읽을 수 있고, 끝난 뒤에는 화면에 쓰지 않는다.
  // (이것은 화면 쪽 조치일 뿐이고, 시작 전 조회를 실제로 막는 것은 DB 정책의 몫이다.)
  const ongoing = contest !== null && getPhase(contest.start_time, contest.end_time, now) === "ongoing";

  useEffect(() => {
    if (!contestId || !ongoing) return;
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
  }, [contestId, ongoing]);

  useEffect(() => {
    if (currentProblemId === undefined) return;
    let cancelled = false;

    (async () => {
      const { data: tcs } = await supabase
        .from("test_cases")
        .select("*")
        .eq("problem_id", currentProblemId)
        .eq("is_hidden", false)
        .order("id");
      if (cancelled) return;
      setTestCases(tcs || []);

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
        .select("code, language")
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
      } else {
        setLanguage("python");
        setCode(STARTER_CODE["python"]);
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
  }, [currentProblemId, contestId]);

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
  }, [code, language, contestId, currentProblemId, draftReady, dirty, saveAttempt]);

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
      alert("대회가 진행 중일 때는 이 화면을 벗어날 수 없습니다. 쓰던 코드는 자동으로 저장됩니다.");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [phase]);

  const handleTest = async () => {
    if (!currentProblem || !draftReady || phase !== "ongoing") return;
    setIsTesting(true);
    setTestError(null);
    setActiveConsoleTab("run");
    try {
      setTestResult(await testCode({ problem_id: currentProblem.id, language, code, contest_id: Number(contestId) }));
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
      }));
    } catch (err) {
      setSubmitError(errorMessage(err, "제출하지 못했습니다. 다시 눌러 주세요."));
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className="page page-narrow">
        <h1 className="page-title">{contest.title}</h1>
        <p className="page-lead">{formatDateTime(contest.end_time)}에 끝난 대회입니다.</p>
        <Link href="/contests" className="btn btn-line mt-6">대회 목록</Link>
      </div>
    );
  }

  const busy = isTesting || isSubmitting;

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <header className="flex flex-none flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line bg-surface px-4 py-2">
        <div className="flex min-w-0 items-center gap-4">
          <Logo className="text-lg" />
          <p className="truncate font-semibold">{contest.title}</p>
        </div>
        <div className="flex items-center gap-4">
          <span role="status" className="text-sm text-muted">
            {saveState === "error" ? (
              <button className="text-link" onClick={() => { setSaveState("saving"); setSaveAttempt((value) => value + 1); }}>
                저장하지 못했습니다. 다시 저장
              </button>
            ) : saveState === "saving" ? "저장하는 중" : saveState === "saved" ? "저장됨" : ""}
          </span>
          <p className="flex items-baseline gap-2">
            <span className="text-sm text-muted">남은 시간</span>
            <span role="timer" className="font-semibold tabular-nums">
              {formatCountdown(new Date(contest.end_time).getTime() - now)}
            </span>
          </p>
          <ThemeToggle />
        </div>
      </header>

      {problems.length > 1 && (
        <nav aria-label="대회 문제" className="flex flex-none gap-1 overflow-x-auto border-b border-line bg-surface px-3">
          {problems.map((p, i) => (
            <button
              key={p.id}
              disabled={dirty || busy}
              aria-pressed={i === activeIdx}
              title={dirty ? "코드가 저장된 뒤에 다른 문제로 넘어갈 수 있습니다." : undefined}
              onClick={() => setActiveIdx(i)}
              className="tab max-w-[16em] gap-1.5"
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
        <div className="grid flex-1 gap-2 p-2 lg:min-h-0 lg:grid-cols-2">
          <div className="box overflow-y-auto p-6 sm:p-8">
            {currentProblem && (
              <ProblemSheet
                problem={currentProblem}
                examples={testCases}
                number={letter(activeIdx)}
                solved={solvedIds.has(currentProblem.id) || justSolved}
              />
            )}
          </div>

          <div className="flex min-h-[80dvh] flex-col gap-2 lg:min-h-0">
            <div className="box flex min-h-0 flex-[3] flex-col overflow-hidden">
              <div className="flex flex-none flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
                <LanguageSelect
                  value={language}
                  disabled={!draftReady}
                  onChange={(next) => {
                    if (Object.values(STARTER_CODE).includes(code)) setCode(STARTER_CODE[next]);
                    setLanguage(next);
                    setDirty(true);
                    setSaveState("saving");
                  }}
                />
                <div className="flex gap-2">
                  <button onClick={handleTest} disabled={busy || !draftReady} className="btn btn-sm btn-line">
                    {isTesting ? "실행하는 중" : "예제 실행"}
                  </button>
                  <button onClick={handleSubmit} disabled={busy || judging || !draftReady} className="btn btn-sm btn-fill">
                    {isSubmitting ? "제출하는 중" : judging ? "채점하는 중" : "제출"}
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <CodeEditor language={language} value={code} onChange={updateCode} readOnly={!draftReady} />
              </div>
            </div>

            <div className="box flex min-h-0 flex-[2] flex-col overflow-hidden">
              <div role="group" aria-label="결과 보기" className="flex flex-none gap-1 border-b border-line px-3 py-1.5">
                <button className="tab tab-sm" aria-pressed={activeConsoleTab === "run"} onClick={() => setActiveConsoleTab("run")}>실행 결과</button>
                <button className="tab tab-sm" aria-pressed={activeConsoleTab === "submission"} onClick={() => setActiveConsoleTab("submission")}>채점 결과</button>
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

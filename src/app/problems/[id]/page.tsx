"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Editor from "@monaco-editor/react";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";
import { useSubmissionState } from "@/hooks/useSubmissionState";
import { Play, Send, ChevronLeft } from "lucide-react";
import clsx from "clsx";
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
} from "react-resizable-panels";
import ProblemContent from "@/components/ProblemContent";
import StampTag, { StampTone, statusLabel } from "@/components/StampTag";
import { getDifficultyMeta } from "@/lib/difficulty";
import { MONACO_LANGUAGE } from "@/lib/languages";
import type { Problem, TestCase, Submission } from "@/lib/types";
import { submitCode, testCode } from "@/lib/judge-api";
import { errorMessage } from "@/lib/errors";

// backend의 SupportedLanguage / judge의 LANGUAGES와 동기화해서 유지할 것.
const STARTER_CODE: Record<string, string> = {
  python: "# 여기에 코드를 작성하세요.\n",
  c: "#include <stdio.h>\n\nint main(void) {\n    // 여기에 코드를 작성하세요.\n    return 0;\n}\n",
  cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // 여기에 코드를 작성하세요.\n    return 0;\n}\n",
  java: "public class Main {\n    public static void main(String[] args) {\n        // 여기에 코드를 작성하세요.\n    }\n}\n",
  // SQL 전용 문제 UI는 아직 없어서, 지금은 테스트케이스의 입력이 스키마/시드
  // 데이터(셋업 스크립트), 여기 작성하는 코드는 쿼리 하나로 취급
  sql: "-- 여기에 쿼리를 작성하세요.\nSELECT 1;\n",
};

// 채점 상태 문자열을 도장 색상으로 매핑
const statusTone = (status: string): StampTone => {
  if (status === "Accepted") return "accept";
  if (status === "Pending" || status === "Running") return "pending";
  if (!status) return "neutral";
  return "reject"; // Wrong Answer / Time Limit Exceeded / Runtime Error / Compile Error / System Error
};

export default function ProblemWorkspace() {
  const params = useParams();
  return <ProblemWorkspaceContent key={String(params.id)} />;
}

function ProblemWorkspaceContent() {
  const { theme } = useTheme();
  const params = useParams();
  const router = useRouter();
  const problemId = params.id as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [history, setHistory] = useState<Submission[]>([]);
  const [activeLeftTab, setActiveLeftTab] = useState<
    "description" | "history"
  >("description");
  const [activeConsoleTab, setActiveConsoleTab] = useState<
    "testcases" | "result" | "submission"
  >("testcases");

  const [code, setCode] = useState(STARTER_CODE["python"]);
  const [language, setLanguage] = useState("python");
  const drafts = useRef<Record<string, string>>({});
  const [mobilePane, setMobilePane] = useState<"description" | "code">("description");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [caseIndex, setCaseIndex] = useState(0);
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
  const [testResult, setTestResult] = useState<string | null>(null);

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
        setLoadError("문제를 불러올 수 없습니다. 주소와 접근 권한을 확인하세요.");
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
          setHistoryError("로그인하면 내 제출 기록을 확인할 수 있습니다.");
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
        if (error) setHistoryError("제출 기록을 불러오지 못했습니다. 탭을 다시 열어 주세요.");
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
      setSubmitError(errorMessage(err, "제출하지 못했습니다. 다시 시도하세요."));
    } finally {
      setIsSubmitting(false);
      requestBusy.current = false;
    }
  };

  const handleTest = async () => {
    if (requestBusy.current || !code.trim()) return;
    requestBusy.current = true;
    setIsTesting(true);
    setActiveConsoleTab("result");
    setMobilePane("code");
    setTestResult("코드 실행 중...");

    try {
      const result = await testCode({
          problem_id: parseInt(problemId, 10),
          language,
          code,
      });

      // 결과 포맷팅 (콘솔 로그 형태, 전부 한글로 통일)
      let output = `최종 결과: ${statusLabel(result.status)}\n\n`;

      if (result.test_cases) {
        result.test_cases.forEach((tc, i) => {
          output += `[테스트케이스 ${i + 1}] - ${statusLabel(tc.status)}\n`;
          output += `입력값: ${tc.input.trim()}\n`;
          output += `기댓값: ${tc.expected.trim()}\n`;
          output += `실제값: ${tc.actual.trim()}\n`;
          output += `------------------------\n`;
        });
      }

      setTestResult(output);
    } catch (err) {
      setTestResult(`실행 오류: ${errorMessage(err, "알 수 없는 오류")}`);
    } finally {
      setIsTesting(false);
      requestBusy.current = false;
    }
  };

  if (loadError) {
    return <div role="alert" className="p-8 text-(--reject)">{loadError}<button className="block mt-4 underline" onClick={() => router.push("/problems")}>문제 목록으로 돌아가기</button></div>;
  }

  if (!problem) {
    return (
      <div className="h-screen bg-(--ink) flex items-center justify-center text-(--seal)">
        Loading...
      </div>
    );
  }

  return (
    <div className="problem-workspace h-dvh flex flex-col bg-(--ink) text-(--text) overflow-hidden font-sans" data-mobile-pane={mobilePane}>
      {/* Workspace Header */}
      <header className="workspace-header bg-(--paper) border-b border-(--rule) flex flex-wrap gap-3 items-center justify-between px-3 py-2 shrink-0">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => router.push("/problems")}
            className="text-(--text-dim) hover:text-(--text) transition-colors flex items-center gap-1 bg-(--rule) hover:bg-(--rule-strong) px-3 py-1.5 rounded-sm text-sm"
          >
            <ChevronLeft size={16} /> 목록
          </button>
          <div className="flex items-center gap-2">
            <span className="docket-label text-(--seal) bg-(--seal)/10 px-2 py-0.5 text-xs">
              № {String(problem.id).padStart(3, "0")}
            </span>
            <h1 className="font-semibold text-(--text) truncate max-w-[40vw]">
              {problem.title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={handleTest}
            disabled={isTesting || isSubmitting || !code.trim()}
            className="flex items-center gap-2 bg-(--rule) hover:bg-(--rule-strong) text-(--text) px-4 py-1.5 rounded-sm font-medium transition-colors disabled:opacity-50 text-sm"
          >
            <Play size={14} className={isTesting ? "animate-pulse" : ""} />{" "}
            {isTesting ? "실행 중..." : "실행"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isTesting || !code.trim() || status === "Pending" || status === "Running"}
            className="flex items-center gap-2 bg-(--seal) hover:bg-(--seal-dim) text-(--ink) px-5 py-1.5 rounded-sm font-semibold transition-colors disabled:opacity-50 text-sm"
          >
            <Send size={14} /> {isSubmitting ? "제출 중..." : status === "Pending" || status === "Running" ? "채점 중..." : "제출"}
          </button>
        </div>
      </header>
      <div className="workspace-mobile-switch" aria-label="작업 영역 선택">
        <button aria-pressed={mobilePane === "description"} onClick={() => setMobilePane("description")}>문제 읽기</button>
        <button aria-pressed={mobilePane === "code"} onClick={() => setMobilePane("code")}>코드 작성 · 결과</button>
      </div>

      {/* Resizable Workspace */}
      <div className="flex-1 overflow-hidden p-2 gap-2 flex">
        <PanelGroup
          orientation="horizontal"
          className="workspace-panels w-full h-full overflow-hidden"
        >
          {/* Left Pane (Description/Result) */}
          <Panel
            defaultSize="45%"
            minSize="25%"
            className="workspace-description bg-(--paper) flex flex-col rounded-lg border border-(--rule)"
          >
            <div className="flex bg-(--paper) border-b border-(--rule) pt-2 px-2 gap-1 overflow-x-auto no-scrollbar shrink-0">
              {([
                { id: "description", label: "문제 설명" },
                { id: "history", label: "내 제출 기록" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  aria-pressed={activeLeftTab === tab.id}
                  onClick={() => setActiveLeftTab(tab.id)}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-t-sm transition-colors whitespace-nowrap",
                    activeLeftTab === tab.id
                      ? "bg-(--rule) text-(--seal)"
                      : "text-(--text-dim) hover:text-(--text) hover:bg-(--rule)/50",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-(--rule-strong)">
              {activeLeftTab === "description" && (
                <div className="prose max-w-none">
                  <h2 className="text-2xl font-bold mb-4">{problem.title}</h2>
                  <div className="flex gap-3 mb-6 text-xs font-medium flex-wrap">
                    <span
                      className="docket-label px-2 py-1 border"
                      style={{
                        color: getDifficultyMeta(problem.difficulty).color,
                        borderColor: getDifficultyMeta(problem.difficulty)
                          .color,
                        backgroundColor: `color-mix(in srgb, ${getDifficultyMeta(problem.difficulty).color} 10%, transparent)`,
                      }}
                    >
                      {getDifficultyMeta(problem.difficulty).label}
                    </span>
                    <span className="bg-(--rule) text-(--text) px-2 py-1 rounded border border-(--rule-strong)">
                      시간: {problem.time_limit_ms}ms
                    </span>
                    <span className="bg-(--rule) text-(--text) px-2 py-1 rounded border border-(--rule-strong)">
                      메모리: {problem.memory_limit_mb}MB
                    </span>
                  </div>

                  {/* 문제 설명 */}
                  <section className="mb-6">
                    <h3 className="text-base font-semibold text-(--text) mb-3">
                      문제
                    </h3>
                    <ProblemContent content={problem.description} />
                  </section>

                  {/* 입력 조건 */}
                  {problem.input_description && (
                    <section className="mb-6">
                      <h3 className="text-base font-semibold text-(--text) mb-3">
                        입력
                      </h3>
                      <div className="bg-(--ink)/50 p-4 rounded-sm border border-(--rule)/50">
                        <ProblemContent content={problem.input_description} />
                      </div>
                    </section>
                  )}

                  {/* 출력 조건 */}
                  {problem.output_description && (
                    <section className="mb-6">
                      <h3 className="text-base font-semibold text-(--text) mb-3">
                        출력
                      </h3>
                      <div className="bg-(--ink)/50 p-4 rounded-sm border border-(--rule)/50">
                        <ProblemContent content={problem.output_description} />
                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeLeftTab === "history" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-(--text) mb-2">
                    내 제출 기록
                  </h3>
                  {historyLoading ? <p role="status">제출 기록을 불러오는 중...</p> : historyError ? <p role="alert" className="text-(--reject)">{historyError}</p> : history.length === 0 ? (
                    <div className="text-(--text-faint) text-center mt-10">
                      제출 내역이 없습니다.
                    </div>
                  ) : (
                    history.map((sub, idx) => (
                      <div
                        key={sub.id || idx}
                        className="bg-(--paper) border border-(--rule) p-4 flex items-center justify-between border-l-2 border-l-(--rule)"
                      >
                        <div className="flex items-center gap-3">
                          <StampTag
                            label={statusLabel(sub.status)}
                            tone={statusTone(sub.status)}
                            size="sm"
                          />
                          <div className="text-xs text-(--text-dim) docket-label">
                            {sub.language} ·{" "}
                            {new Date(sub.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs font-mono bg-(--ink) px-2 py-1 text-(--text-faint)">
                          {sub.id.substring(0, 8)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </Panel>

          {/* Vertical Handle */}
          <PanelResizeHandle className="workspace-divider w-2 bg-(--ink) hover:bg-(--seal)/20 transition-colors cursor-col-resize" />

          {/* Right Pane (Editor & Console) */}
          <Panel defaultSize="55%" minSize="30%" className="workspace-code">
            <PanelGroup orientation="vertical">
              {/* Editor Top Pane */}
              <Panel
                defaultSize="65%"
                minSize="25%"
                className="bg-(--paper) flex flex-col rounded-lg border border-(--rule)"
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-(--rule)">
                  <span className="text-sm font-semibold">코드</span>
                  <select
                    aria-label="프로그래밍 언어"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-(--rule) text-(--text) text-xs font-medium border border-(--rule-strong) rounded-md px-3 py-1.5 focus:outline-none focus:border-(--seal) hover:bg-(--rule-strong) transition-colors cursor-pointer"
                  >
                    <option value="python">Python 3</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="sql">SQL</option>
                  </select>
                </div>

                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    language={MONACO_LANGUAGE[language] ?? "plaintext"}
                    theme={theme === "dark" ? "vs-dark" : "light"}
                    value={code}
                    onChange={(val) => setCode(val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      padding: { top: 16 },
                      scrollBeyondLastLine: false,
                      smoothScrolling: true,
                      cursorBlinking: "smooth",
                      automaticLayout: true,
                      tabSize: 4,
                    }}
                  />
                </div>
              </Panel>

              {/* Horizontal Handle */}
              <PanelResizeHandle className="h-2 bg-(--ink) hover:bg-(--seal)/20 transition-colors cursor-row-resize" />

              {/* Console Bottom Pane */}
              <Panel
                defaultSize="35%"
                minSize="20%"
                className="bg-(--paper) flex flex-col rounded-lg border border-(--rule)"
              >
                <div className="flex bg-(--paper) border-b border-(--rule) px-2 pt-2 gap-1 shrink-0">
                  {([
                    { id: "testcases", label: "예제" },
                    { id: "result", label: "실행 결과" },
                    { id: "submission", label: "채점 결과" },
                  ] as const).map((tab) => (
                    <button
                      key={tab.id}
                      aria-pressed={activeConsoleTab === tab.id}
                      onClick={() => setActiveConsoleTab(tab.id)}
                      className={clsx(
                        "px-4 py-1.5 text-xs font-medium rounded-t-sm transition-colors flex items-center gap-1.5",
                        activeConsoleTab === tab.id
                          ? "bg-(--rule) text-(--text)"
                          : "text-(--text-faint) hover:text-(--text) hover:bg-(--rule)/50",
                      )}
                    >
                      {tab.id === "result" && isTesting && (
                        <div className="w-2 h-2 bg-(--pending) rounded-full animate-pulse" />
                      )}
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-4 font-mono text-sm overflow-auto scrollbar-thin scrollbar-thumb-(--rule-strong) bg-(--ink)">
                  {activeConsoleTab === "testcases" && (
                    <div className="text-(--text-dim) space-y-6">
                      <div className="flex gap-2 flex-wrap" aria-label="예제 선택">
                        {testCases.map((tc, idx) => <button key={tc.id} className={clsx("px-3 py-1 rounded-md border", caseIndex === idx ? "border-(--seal) text-(--text) bg-(--paper-raised)" : "border-(--rule)")} aria-pressed={caseIndex === idx} onClick={() => setCaseIndex(idx)}>예제 {idx + 1}</button>)}
                      </div>
                      {testCases.slice(caseIndex, caseIndex + 1).map((tc) => (
                        <div key={tc.id}>
                          <p className="mb-2 font-semibold text-(--text)">
                            입력
                          </p>
                          <div className="bg-(--rule)/50 p-2 rounded border border-(--rule-strong)/50 text-(--text) mb-4 whitespace-pre-wrap">
                            {tc.input_data}
                          </div>
                          <p className="mb-2 font-semibold text-(--text)">
                            예상 출력
                          </p>
                          <div className="bg-(--rule)/50 p-2 rounded border border-(--rule-strong)/50 text-(--text) whitespace-pre-wrap">
                            {tc.expected_output}
                          </div>
                        </div>
                      ))}
                      {testCases.length === 0 && (
                        <div className="text-(--text-faint) italic">
                          등록된 테스트 케이스가 없습니다.
                        </div>
                      )}
                    </div>
                  )}
                  {activeConsoleTab === "result" && (
                    <div role="status" className="text-(--text) whitespace-pre-wrap">
                      {testResult || (
                        <span className="text-(--text-faint) italic">
                          실행을 누르면 공개된 예제로 코드를 테스트합니다. 제출하면 비공개 테스트를 포함해 채점합니다.
                        </span>
                      )}
                    </div>
                  )}
                  {activeConsoleTab === "submission" && (
                    <div role="status" className="space-y-4 font-sans">
                      {submitError ? <p role="alert" className="text-(--reject)">{submitError}</p> : isSubmitting ? <p>코드를 제출하는 중...</p> : subId ? <><StampTag label={statusLabel(status)} tone={statusTone(status)} /><p className="text-sm text-(--text-dim)">{status === "Pending" || status === "Running" ? "채점 중입니다. 다른 영역에서 풀이를 계속 살펴볼 수 있습니다." : "채점이 완료되었습니다. 내 제출 기록에서 이전 결과를 확인하세요."}</p></> : <p>코드를 작성한 뒤 제출을 눌러 채점 결과를 확인하세요.</p>}
                    </div>
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Editor from "@monaco-editor/react";
import { useSubmissionState } from "@/hooks/useSubmissionState";
import { Play, Send, ChevronLeft, Terminal, CheckCircle, XCircle } from "lucide-react";
import clsx from "clsx";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import ProblemContent from "@/components/ProblemContent";

export default function ProblemWorkspace() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.id as string;

  const [problem, setProblem] = useState<any>(null);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeLeftTab, setActiveLeftTab] = useState<"description" | "result" | "history">("description");
  const [activeConsoleTab, setActiveConsoleTab] = useState<"testcases" | "result">("testcases");

  const [code, setCode] = useState("# 여기에 코드를 작성하세요.\n");
  const [language, setLanguage] = useState("python");

  const [subId, setSubId] = useState<string | null>(null);
  const status = useSubmissionState(subId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!problemId) return;
    const fetchProblem = async () => {
      const { data } = await supabase.from("problems").select("*").eq("id", problemId).single();
      if (data) setProblem(data);

      const { data: testCasesData } = await supabase.from("test_cases").select("*").eq("problem_id", problemId).eq("is_hidden", false).order("id");
      if (testCasesData) setTestCases(testCasesData);
    };
    fetchProblem();
  }, [problemId]);

  useEffect(() => {
    if (activeLeftTab === "history" && problemId) {
      const fetchHistory = async () => {
        const { data } = await supabase
          .from("submissions")
          .select("*")
          .eq("problem_id", problemId)
          .order("created_at", { ascending: false });
        if (data) setHistory(data);
      };
      fetchHistory();
    }
  }, [activeLeftTab, problemId]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubId(null);
    setActiveLeftTab("result");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: parseInt(problemId, 10),
          language,
          code,
        }),
      });

      if (!response.ok) throw new Error("서버 통신 에러");
      const data = await response.json();
      setSubId(data.submission_id);
    } catch (err: any) {
      alert(err.message || "오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setActiveConsoleTab("result");
    setTestResult("코드 실행 중...");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/test_run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_id: parseInt(problemId, 10),
          language,
          code,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status === "error") {
        throw new Error(data.message || "서버 통신 에러");
      }

      // Format test result
      const result = data.result;
      let output = `최종 결과: ${result.status}\n\n`;

      if (result.test_cases) {
        result.test_cases.forEach((tc: any, i: number) => {
          output += `[Test Case ${i + 1}] - ${tc.status}\n`;
          output += `Input: ${tc.input.trim()}\n`;
          output += `Expected: ${tc.expected.trim()}\n`;
          output += `Actual: ${tc.actual.trim()}\n`;
          output += `------------------------\n`;
        });
      }

      setTestResult(output);
    } catch (err: any) {
      setTestResult(`실행 오류: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (!problem) {
    return <div className="h-screen bg-slate-950 flex items-center justify-center text-emerald-400">Loading...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Workspace Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/problems")} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm">
            <ChevronLeft size={16} /> 목록
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded text-sm">{problem.id}</span>
            <h1 className="font-semibold text-slate-200">{problem.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 text-sm"
          >
            <Play size={14} className={isTesting ? "animate-pulse" : ""} /> 테스트
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-1.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 text-sm"
          >
            <Send size={14} /> 제출
          </button>
        </div>
      </header>

      {/* Resizable Workspace */}
      <div className="flex-1 overflow-hidden p-2 gap-2 flex">
        <PanelGroup orientation="horizontal" className="w-full h-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl">

          {/* Left Pane (Description/Result) */}
          <Panel defaultSize={50} minSize={25} className="bg-slate-900 flex flex-col">
            <div className="flex bg-slate-900 border-b border-slate-800 pt-2 px-2 gap-1 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: "description", label: "문제 설명" },
                { id: "result", label: "채점 결과" },
                { id: "history", label: "제출 현황" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveLeftTab(tab.id as any)}
                  className={clsx(
                    "px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap",
                    activeLeftTab === tab.id ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
              {activeLeftTab === "description" && (
                <div className="prose prose-invert max-w-none">
                  <h2 className="text-2xl font-bold mb-4">{problem.title}</h2>
                  <div className="flex gap-3 mb-6 text-xs font-medium flex-wrap">
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Easy</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">시간: {problem.time_limit_ms}ms</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">메모리: {problem.memory_limit_mb}MB</span>
                  </div>

                  {/* 문제 설명 */}
                  <section className="mb-6">
                    <h3 className="text-base font-semibold text-slate-200 mb-3">문제</h3>
                    <ProblemContent content={problem.description} />
                  </section>

                  {/* 입력 조건 */}
                  {problem.input_description && (
                    <section className="mb-6">
                      <h3 className="text-base font-semibold text-slate-200 mb-3">입력</h3>
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                        <ProblemContent content={problem.input_description} />
                      </div>
                    </section>
                  )}

                  {/* 출력 조건 */}
                  {problem.output_description && (
                    <section className="mb-6">
                      <h3 className="text-base font-semibold text-slate-200 mb-3">출력</h3>
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                        <ProblemContent content={problem.output_description} />
                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeLeftTab === "result" && (
                <div className="flex flex-col items-center justify-center h-full">
                  {!subId ? (
                    <div className="text-slate-500 flex flex-col items-center gap-3">
                      <Send size={48} className="text-slate-700" />
                      <p>아직 제출한 코드가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="text-center bg-slate-950/50 p-8 rounded-2xl border border-slate-800 shadow-xl max-w-sm w-full">
                      <h3 className="text-sm font-medium text-slate-400 mb-6 uppercase tracking-wider">채점 상태</h3>
                      <div className="flex flex-col items-center gap-4">
                        {status === "Accepted" && <CheckCircle className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" size={72} />}
                        {status === "Wrong Answer" && <XCircle className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" size={72} />}
                        {status === "Pending" && <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-slate-700 border-t-blue-500"></div>}
                        {status === "Running" && <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-slate-700 border-t-yellow-500"></div>}

                        <div className={clsx(
                          "text-2xl font-bold mt-2",
                          status === "Accepted" ? "text-emerald-400" :
                            status === "Wrong Answer" ? "text-red-400" :
                              "text-blue-400"
                        )}>
                          {status}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeLeftTab === "history" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-lg font-bold text-slate-200 mb-2">제출 현황</h3>
                  {history.length === 0 ? (
                    <div className="text-slate-500 text-center mt-10">
                      제출 내역이 없습니다.
                    </div>
                  ) : (
                    history.map((sub, idx) => (
                      <div key={sub.id || idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm flex items-center justify-between">
                        <div>
                          <div className={clsx(
                            "font-semibold text-sm mb-1",
                            sub.status === "Accepted" ? "text-emerald-400" :
                              sub.status === "Pending" || sub.status === "Running" ? "text-blue-400" :
                                "text-red-400"
                          )}>
                            {sub.status}
                          </div>
                          <div className="text-xs text-slate-400">
                            {sub.language} | {new Date(sub.created_at).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-xs font-mono bg-slate-950 px-2 py-1 rounded text-slate-500">
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
          <PanelResizeHandle className="w-2 bg-slate-950 hover:bg-emerald-500/20 transition-colors cursor-col-resize" />

          {/* Right Pane (Editor & Console) */}
          <Panel defaultSize={50} minSize={30}>
            <PanelGroup orientation="vertical">
              {/* Editor Top Pane */}
              <Panel defaultSize={50} minSize={20} className="bg-[#1e1e1e] flex flex-col relative">
                <div className="absolute top-2 left-4 z-10">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-emerald-500 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <option value="python">Python 3</option>
                    <option value="cpp" disabled>C++ (준비 중)</option>
                    <option value="java" disabled>Java (준비 중)</option>
                    <option value="node" disabled>Node.js (준비 중)</option>
                  </select>
                </div>

                <div className="flex-1 pt-12">
                  <Editor
                    height="100%"
                    language={language === "python" ? "python" : "plaintext"}
                    theme="vs-dark"
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
                    }}
                  />
                </div>
              </Panel>

              {/* Horizontal Handle */}
              <PanelResizeHandle className="h-2 bg-slate-950 hover:bg-emerald-500/20 transition-colors cursor-row-resize" />

              {/* Console Bottom Pane */}
              <Panel defaultSize={50} minSize={10} className="bg-slate-900 flex flex-col border-t border-slate-800">
                <div className="flex bg-slate-900 border-b border-slate-800 px-2 pt-2 gap-1 shrink-0">
                  {[
                    { id: "testcases", label: "Testcases" },
                    { id: "result", label: "Test Result" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveConsoleTab(tab.id as any)}
                      className={clsx(
                        "px-4 py-1.5 text-xs font-medium rounded-t-lg transition-colors flex items-center gap-1.5",
                        activeConsoleTab === tab.id ? "bg-slate-800 text-slate-200" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                      )}
                    >
                      {tab.id === "result" && isTesting && <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />}
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-4 font-mono text-sm overflow-auto scrollbar-thin scrollbar-thumb-slate-700 bg-[#0d1117]">
                  {activeConsoleTab === "testcases" && (
                    <div className="text-slate-400 space-y-6">
                      {testCases.map((tc, idx) => (
                        <div key={tc.id || idx}>
                          <h4 className="text-emerald-400 font-semibold mb-2">Test Case {idx + 1}</h4>
                          <p className="mb-2 font-semibold text-slate-300">Input:</p>
                          <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50 text-slate-300 mb-4 whitespace-pre-wrap">{tc.input_data}</div>
                          <p className="mb-2 font-semibold text-slate-300">Expected Output:</p>
                          <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50 text-slate-300 whitespace-pre-wrap">{tc.expected_output}</div>
                        </div>
                      ))}
                      {testCases.length === 0 && (
                        <div className="text-slate-500 italic">등록된 테스트 케이스가 없습니다.</div>
                      )}
                    </div>
                  )}
                  {activeConsoleTab === "result" && (
                    <div className="text-slate-300 whitespace-pre-wrap">
                      {testResult || <span className="text-slate-600 italic">"테스트" 버튼을 눌러 결과를 확인하세요. (제출 시에는 이 콘솔에 반영되지 않습니다)</span>}
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Editor from "@monaco-editor/react";
import { useSubmissionState } from "@/hooks/useSubmissionState";
import { Play, Send, ChevronLeft, Terminal, CheckCircle, XCircle, Code2, Check, X } from "lucide-react";
import clsx from "clsx";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

export default function ProblemWorkspace() {
  const params = useParams();
  const router = useRouter();
  const problemId = params.id as string;

  const [problem, setProblem] = useState<any>(null);
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
    };
    fetchProblem();
  }, [problemId]);

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
    
    // 시뮬레이션
    setTimeout(() => {
      setTestResult("테스트 결과: 임시 데이터\n\nInput: 1 2\nOutput: 3\nExpected: 3\nStatus: Accepted");
      setIsTesting(false);
    }, 1500);
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
          <Panel defaultSize={40} minSize={25} className="bg-slate-900 flex flex-col">
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
                  <div className="flex gap-3 mb-6 text-xs font-medium">
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">Easy</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">시간: {problem.time_limit_ms}ms</span>
                    <span className="bg-slate-800 text-slate-300 px-2 py-1 rounded border border-slate-700">메모리: {problem.memory_limit_mb}MB</span>
                  </div>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                    {problem.description}
                  </div>
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
                <div className="text-slate-500 text-center mt-20 flex flex-col items-center gap-3">
                  <Terminal size={48} className="text-slate-700" />
                  제출 기록 기능은 아직 준비 중입니다.
                </div>
              )}
            </div>
          </Panel>

          {/* Vertical Handle */}
          <PanelResizeHandle className="w-2 bg-slate-950 hover:bg-emerald-500/20 transition-colors cursor-col-resize flex flex-col justify-center items-center group">
            <div className="w-0.5 h-8 bg-slate-700 group-hover:bg-emerald-500 rounded-full transition-colors" />
          </PanelResizeHandle>

          {/* Right Pane (Editor & Console) */}
          <Panel defaultSize={60} minSize={30}>
            <PanelGroup orientation="vertical">
              {/* Editor Top Pane */}
              <Panel defaultSize={70} minSize={20} className="bg-[#1e1e1e] flex flex-col relative">
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
              <PanelResizeHandle className="h-2 bg-slate-950 hover:bg-emerald-500/20 transition-colors cursor-row-resize flex justify-center items-center group relative z-10">
                <div className="h-0.5 w-8 bg-slate-700 group-hover:bg-emerald-500 rounded-full transition-colors" />
              </PanelResizeHandle>

              {/* Console Bottom Pane */}
              <Panel defaultSize={30} minSize={10} className="bg-slate-900 flex flex-col border-t border-slate-800">
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
                    <div className="text-slate-400">
                      <p className="mb-2 font-semibold text-slate-300">Input:</p>
                      <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50 text-slate-300 mb-4">1 2</div>
                      <p className="mb-2 font-semibold text-slate-300">Expected Output:</p>
                      <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50 text-slate-300">3</div>
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

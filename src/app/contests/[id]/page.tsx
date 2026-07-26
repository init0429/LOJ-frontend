"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Editor from "@monaco-editor/react";
import { useSubmissionState } from "@/hooks/useSubmissionState";
import { Scale } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import ProblemContent from "@/components/ProblemContent";
import StampTag, { StampTone, statusLabel } from "@/components/StampTag";

const STARTER_CODE: Record<string, string> = {
    python: "# 여기에 코드를 작성하세요.\n",
    cpp: "#include <iostream>\nusing namespace std;\n\nint main() {\n    // 여기에 코드를 작성하세요.\n    return 0;\n}\n",
    java: "public class Main {\n    public static void main(String[] args) {\n        // 여기에 코드를 작성하세요.\n    }\n}\n",
};

const MONACO_LANGUAGE: Record<string, string> = { python: "python", cpp: "cpp", java: "java" };

const statusTone = (status: string): StampTone => {
    if (status === "Accepted") return "accept";
    if (status === "Pending" || status === "Running") return "pending";
    if (!status) return "neutral";
    return "reject";
};

type Phase = "upcoming" | "ongoing" | "ended";

function getPhase(start: string, end: string, now: number): Phase {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (now < s) return "upcoming";
    if (now > e) return "ended";
    return "ongoing";
}

function formatCountdown(ms: number) {
    const clamped = Math.max(0, ms);
    const totalSec = Math.floor(clamped / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ContestWorkspace() {
    const params = useParams();
    const contestId = params.id as string;

    const [contest, setContest] = useState<any>(null);
    const [problems, setProblems] = useState<any[]>([]);
    const [activeIdx, setActiveIdx] = useState(0);
    const [now, setNow] = useState(Date.now());

    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("python");
    const [testCases, setTestCases] = useState<any[]>([]);
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

    const [subId, setSubId] = useState<string | null>(null);
    const status = useSubmissionState(subId);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [consoleOutput, setConsoleOutput] = useState<string | null>(null);

    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipNextSave = useRef(false);
    const currentProblem = problems[activeIdx];

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!contestId) return;
        (async () => {
            const { data: contestData } = await supabase.from("contests").select("*").eq("id", contestId).single();
            setContest(contestData);

            const { data: cp } = await supabase
                .from("contest_problems")
                .select("order, problems(*)")
                .eq("contest_id", contestId)
                .order("order", { ascending: true });

            setProblems((cp || []).map((row: any) => row.problems).filter(Boolean));
        })();
    }, [contestId]);

    useEffect(() => {
        if (!currentProblem) return;
        skipNextSave.current = true;

        (async () => {
            const { data: tcs } = await supabase
                .from("test_cases")
                .select("*")
                .eq("problem_id", currentProblem.id)
                .eq("is_hidden", false)
                .order("id");
            setTestCases(tcs || []);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: draft } = await supabase
                .from("contest_drafts")
                .select("code, language")
                .eq("contest_id", contestId)
                .eq("problem_id", currentProblem.id)
                .eq("user_id", session.user.id)
                .maybeSingle();

            if (draft) {
                setCode(draft.code);
                setLanguage(draft.language);
            } else {
                setLanguage("python");
                setCode(STARTER_CODE["python"]);
            }
        })();
    }, [currentProblem?.id]);

    useEffect(() => {
        if (!currentProblem) return;
        if (skipNextSave.current) {
            skipNextSave.current = false;
            return;
        }

        setSaveState("saving");
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            await supabase.from("contest_drafts").upsert({
                contest_id: Number(contestId),
                problem_id: currentProblem.id,
                user_id: session.user.id,
                code,
                language,
                updated_at: new Date().toISOString(),
            });
            setSaveState("saved");
        }, 1200);

        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [code, language]);

    const phase: Phase | null = contest ? getPhase(contest.start_time, contest.end_time, now) : null;

    useEffect(() => {
        if (phase !== "ongoing") return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [phase]);

    useEffect(() => {
        if (phase !== "ongoing") return;
        history.pushState(null, "", location.href);
        const onPopState = () => {
            history.pushState(null, "", location.href);
            alert("콘테스트 진행 중에는 이 화면을 벗어날 수 없습니다. 코드는 자동으로 저장되고 있습니다.");
        };
        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [phase]);

    const authHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("로그인이 필요합니다.");
        return { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` };
    };

    const handleTest = async () => {
        if (!currentProblem) return;
        setIsTesting(true);
        setConsoleOutput("코드 실행 중...");
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/test_run`, {
                method: "POST",
                headers: await authHeaders(),
                body: JSON.stringify({ problem_id: currentProblem.id, language, code }),
            });
            const data = await response.json();
            if (!response.ok || data.status === "error") throw new Error(data.message || "서버 통신 에러");

            const result = data.result;
            let output = `최종 결과: ${statusLabel(result.status)}\n\n`;
            (result.test_cases || []).forEach((tc: any, i: number) => {
                output += `[테스트케이스 ${i + 1}] - ${statusLabel(tc.status)}\n`;
                output += `입력값: ${tc.input.trim()}\n기댓값: ${tc.expected.trim()}\n실제값: ${tc.actual.trim()}\n------------------------\n`;
            });
            setConsoleOutput(output);
        } catch (err: any) {
            setConsoleOutput(`실행 오류: ${err.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async () => {
        if (!currentProblem) return;
        setIsSubmitting(true);
        setSubId(null);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/submit`, {
                method: "POST",
                headers: await authHeaders(),
                body: JSON.stringify({ problem_id: currentProblem.id, language, code, contest_id: Number(contestId) }),
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

    if (!contest) {
        return <div className="h-screen bg-[var(--ink)] flex items-center justify-center text-[var(--seal)]">Loading...</div>;
    }

    // 시작 전
    if (phase === "upcoming") {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[var(--ink)] text-center px-6">
                <Scale className="text-[var(--seal)] mb-6" size={40} />
                <div className="docket-label text-xs text-[var(--text-faint)] mb-2">개정 전</div>
                <h1 className="text-2xl font-semibold text-[var(--text)] mb-6">{contest.title}</h1>
                <div className="docket-label text-4xl text-[var(--seal)] mb-6 tabular-nums">
                    {formatCountdown(new Date(contest.start_time).getTime() - now)}
                </div>
                <p className="text-[var(--text-dim)] mb-10">시작 시각: {new Date(contest.start_time).toLocaleString()}</p>
                <Link
                    href="/contests"
                    className="docket-label text-[11px] border border-[var(--rule)] px-4 py-2 text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--rule-strong)] transition-colors"
                >
                    목록으로
                </Link>
            </div>
        );
    }

    // 종결
    if (phase === "ended") {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-[var(--ink)] text-center px-6">
                <StampTag label="종결" tone="neutral" size="lg" />
                <h1 className="text-2xl font-semibold text-[var(--text)] mt-6 mb-2">{contest.title}</h1>
                <p className="text-[var(--text-dim)] mb-10">심리가 종료되었습니다.</p>
                <Link
                    href="/contests"
                    className="docket-label text-[11px] border border-[var(--rule)] px-4 py-2 text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--rule-strong)] transition-colors"
                >
                    목록으로
                </Link>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[var(--ink)]">
            <div className="h-14 shrink-0 bg-[var(--paper)] border-b border-[var(--rule)] flex items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <Scale className="text-[var(--seal)]" size={18} />
                    <span className="docket-label text-sm text-[var(--text)]">{contest.title}</span>
                </div>
                <div className="flex items-center gap-6">
                    <span className="docket-label text-[10px] text-[var(--text-faint)] w-16 text-right">
                        {saveState === "saving" ? "저장 중" : saveState === "saved" ? "저장됨" : ""}
                    </span>
                    <div className="docket-label text-lg text-[var(--reject)] tabular-nums">
                        {formatCountdown(new Date(contest.end_time).getTime() - now)}
                    </div>
                </div>
            </div>

            {problems.length > 1 && (
                <div className="flex bg-[var(--paper)] border-b border-[var(--rule)] px-4 gap-1 shrink-0 overflow-x-auto">
                    {problems.map((p, i) => (
                        <button
                            key={p.id}
                            onClick={() => setActiveIdx(i)}
                            className={clsx(
                                "docket-label text-[11px] px-4 py-2 border-b-2 transition-colors whitespace-nowrap",
                                i === activeIdx
                                    ? "border-[var(--seal)] text-[var(--seal)]"
                                    : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)]"
                            )}
                        >
                            № {String(p.id).padStart(3, "0")} · {p.title}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                {/* 문제 설명 */}
                <div className="w-1/2 overflow-y-auto p-8 border-r border-[var(--rule)]">
                    {currentProblem && (
                        <>
                            <h1 className="text-xl font-semibold text-[var(--text)] mb-4">{currentProblem.title}</h1>
                            <ProblemContent content={currentProblem.description} />
                            {currentProblem.input_description && (
                                <section className="mt-6">
                                    <h3 className="text-base font-semibold text-[var(--text)] mb-3">입력</h3>
                                    <div className="bg-[var(--ink)]/50 p-4 border border-[var(--rule)]/50">
                                        <ProblemContent content={currentProblem.input_description} />
                                    </div>
                                </section>
                            )}
                            {currentProblem.output_description && (
                                <section className="mt-6">
                                    <h3 className="text-base font-semibold text-[var(--text)] mb-3">출력</h3>
                                    <div className="bg-[var(--ink)]/50 p-4 border border-[var(--rule)]/50">
                                        <ProblemContent content={currentProblem.output_description} />
                                    </div>
                                </section>
                            )}
                            {testCases.length > 0 && (
                                <section className="mt-6 space-y-4">
                                    <h3 className="text-base font-semibold text-[var(--text)] mb-3">예제</h3>
                                    {testCases.map((tc, idx) => (
                                        <div key={tc.id || idx} className="text-sm">
                                            <p className="mb-1 font-semibold text-[var(--text-dim)]">입력 {idx + 1}</p>
                                            <div className="bg-[var(--rule)]/40 p-2 border border-[var(--rule)] text-[var(--text)] mb-2 whitespace-pre-wrap font-mono">{tc.input_data}</div>
                                            <p className="mb-1 font-semibold text-[var(--text-dim)]">출력 {idx + 1}</p>
                                            <div className="bg-[var(--rule)]/40 p-2 border border-[var(--rule)] text-[var(--text)] whitespace-pre-wrap font-mono">{tc.expected_output}</div>
                                        </div>
                                    ))}
                                </section>
                            )}
                        </>
                    )}
                </div>

                {/* 에디터 + 콘솔 */}
                <div className="w-1/2 flex flex-col">
                    <div className="flex items-center justify-between px-4 py-2 bg-[var(--paper)] border-b border-[var(--rule)] shrink-0">
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="bg-[var(--rule)] text-[var(--text)] text-xs font-medium border border-[var(--rule-strong)] rounded-sm px-3 py-1.5 focus:outline-none focus:border-[var(--seal)]"
                        >
                            <option value="python">Python 3</option>
                            <option value="cpp">C++</option>
                            <option value="java">Java</option>
                        </select>
                        <div className="flex gap-2">
                            <button
                                onClick={handleTest}
                                disabled={isTesting}
                                className="docket-label text-[11px] px-4 py-1.5 bg-[var(--rule)] hover:bg-[var(--rule-strong)] text-[var(--text)] transition-colors disabled:opacity-50"
                            >
                                테스트
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="docket-label text-[11px] px-4 py-1.5 bg-[var(--seal)] hover:bg-[var(--seal-dim)] text-[var(--ink)] font-semibold transition-colors disabled:opacity-50"
                            >
                                제출
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0">
                        <Editor
                            height="100%"
                            language={MONACO_LANGUAGE[language] ?? "plaintext"}
                            theme="vs-dark"
                            value={code}
                            onChange={(val) => setCode(val || "")}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                padding: { top: 16 },
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>

                    <div className="h-44 shrink-0 border-t border-[var(--rule)] bg-[#0d1117] flex flex-col">
                        <div className="px-4 py-2 border-b border-[var(--rule)] flex items-center gap-2">
                            {subId && <StampTag label={statusLabel(status)} tone={statusTone(status)} size="sm" />}
                            <span className="docket-label text-[10px] text-[var(--text-faint)]">결과</span>
                        </div>
                        <div className="flex-1 p-3 text-xs font-mono text-[var(--text-dim)] overflow-auto whitespace-pre-wrap">
                            {consoleOutput || "\"테스트\" 또는 \"제출\" 버튼을 눌러 결과를 확인하세요."}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
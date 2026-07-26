"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import StampTag from "@/components/StampTag";
import AdminTabs from "@/components/AdminTabs";

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

const DIFFICULTY_OPTIONS = [
    { value: 1, label: "경범죄" },
    { value: 2, label: "단순범죄" },
    { value: 3, label: "일반범죄" },
    { value: 4, label: "중범죄" },
    { value: 5, label: "흉악범죄" },
];

const emptyTestCase = (): TestCaseDraft => ({ input_data: "", expected_output: "", is_hidden: false });

export default function AdminProblemsPage() {
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [existing, setExisting] = useState<ProblemRow[]>([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [inputDescription, setInputDescription] = useState("");
    const [outputDescription, setOutputDescription] = useState("");
    const [timeLimitMs, setTimeLimitMs] = useState(2000);
    const [memoryLimitMb, setMemoryLimitMb] = useState(128);
    const [difficulty, setDifficulty] = useState<number>(1);
    const [testCases, setTestCases] = useState<TestCaseDraft[]>([emptyTestCase()]);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 관리자 권한 확인
    useEffect(() => {
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace("/");
                return;
            }
            const { data: profile } = await supabase
                .from("profiles")
                .select("is_admin")
                .eq("id", session.user.id)
                .single();

            setIsAdmin(!!profile?.is_admin);
            setChecking(false);
        })();
    }, [router]);

    useEffect(() => {
        if (!isAdmin) return;
        supabase
            .from("problems")
            .select("id, title, difficulty")
            .order("id", { ascending: false })
            .then(({ data }) => setExisting(data || []));
    }, [isAdmin]);

    const updateTestCase = (idx: number, patch: Partial<TestCaseDraft>) => {
        setTestCases((prev) => prev.map((tc, i) => (i === idx ? { ...tc, ...patch } : tc)));
    };

    const addTestCase = () => setTestCases((prev) => [...prev, emptyTestCase()]);
    const removeTestCase = (idx: number) => setTestCases((prev) => prev.filter((_, i) => i !== idx));

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

        if (!title.trim()) return setError("제목을 입력하세요.");
        if (!description.trim()) return setError("문제 설명을 입력하세요.");
        const validCases = testCases.filter((tc) => tc.input_data.trim() && tc.expected_output.trim());
        if (validCases.length === 0) return setError("테스트케이스를 하나 이상 입력하세요.");

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
            if (tcErr) throw tcErr;

            setExisting((prev) => [{ id: problem.id, title: problem.title, difficulty: problem.difficulty }, ...prev]);
            resetForm();
        } catch (err: any) {
            setError(err.message || "등록 중 오류가 발생했습니다.");
        } finally {
            setSubmitting(false);
        }
    };

    if (checking) {
        return <div className="h-screen bg-[var(--ink)] flex items-center justify-center text-[var(--seal)]">Loading...</div>;
    }

    if (!isAdmin) {
        return (
            <div className="h-screen bg-[var(--ink)] flex flex-col items-center justify-center gap-4 text-center px-6">
                <StampTag label="기각" tone="reject" size="lg" />
                <p className="text-[var(--text-dim)]">관리자만 접근할 수 있는 화면입니다.</p>
            </div>
        );
    }

    return (
        <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-[var(--ink)] min-h-[calc(100vh-64px)]">
            <div className="max-w-3xl mx-auto">
                <AdminTabs />
                <h1 className="text-2xl font-semibold text-[var(--text)] mb-6">문제 등록</h1>

                <div className="bg-[var(--paper)] border border-[var(--rule)] p-6 space-y-5 mb-10">
                    <div>
                        <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">제목</label>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)]"
                            placeholder="예: 두 수의 합"
                        />
                    </div>

                    <div>
                        <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">문제 설명</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-2.5 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)] resize-y font-mono text-sm"
                            placeholder="마크다운으로 작성 가능"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">입력 설명 (선택)</label>
                            <textarea
                                value={inputDescription}
                                onChange={(e) => setInputDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)] resize-y font-mono text-sm"
                            />
                        </div>
                        <div>
                            <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">출력 설명 (선택)</label>
                            <textarea
                                value={outputDescription}
                                onChange={(e) => setOutputDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2.5 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)] resize-y font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">시간 제한(ms)</label>
                            <input
                                type="number"
                                value={timeLimitMs}
                                onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)]"
                            />
                        </div>
                        <div>
                            <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">메모리 제한(MB)</label>
                            <input
                                type="number"
                                value={memoryLimitMb}
                                onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)]"
                            />
                        </div>
                        <div>
                            <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">난이도</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(Number(e.target.value))}
                                className="w-full px-4 py-2.5 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)]"
                            >
                                {DIFFICULTY_OPTIONS.map((d) => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* 테스트케이스 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="docket-label text-[11px] text-[var(--text-dim)]">테스트케이스</label>
                            <button
                                onClick={addTestCase}
                                className="docket-label text-[10px] flex items-center gap-1 text-[var(--seal)] hover:text-[var(--seal-dim)] transition-colors"
                            >
                                <Plus size={12} /> 추가
                            </button>
                        </div>

                        <div className="space-y-3">
                            {testCases.map((tc, idx) => (
                                <div key={idx} className="border border-[var(--rule)] p-4 relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="docket-label text-[10px] text-[var(--text-faint)]">
                                            #{idx + 1}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-1.5 text-xs text-[var(--text-dim)] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={tc.is_hidden}
                                                    onChange={(e) => updateTestCase(idx, { is_hidden: e.target.checked })}
                                                />
                                                히든(채점 전용, 문제에 노출 안 됨)
                                            </label>
                                            {testCases.length > 1 && (
                                                <button onClick={() => removeTestCase(idx)} className="text-[var(--text-faint)] hover:text-[var(--reject)] transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <textarea
                                            value={tc.input_data}
                                            onChange={(e) => updateTestCase(idx, { input_data: e.target.value })}
                                            rows={3}
                                            placeholder="입력"
                                            className="w-full px-3 py-2 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)] font-mono text-xs resize-y"
                                        />
                                        <textarea
                                            value={tc.expected_output}
                                            onChange={(e) => updateTestCase(idx, { expected_output: e.target.value })}
                                            rows={3}
                                            placeholder="기댓값"
                                            className="w-full px-3 py-2 bg-[var(--ink)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)] font-mono text-xs resize-y"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2">
                            <StampTag label="반려" tone="reject" size="sm" tilt={false} />
                            <p className="text-sm text-[var(--reject)]">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleCreate}
                        disabled={submitting}
                        className="w-full py-3 bg-[var(--seal)] hover:bg-[var(--seal-dim)] text-[var(--ink)] font-semibold rounded-sm transition-colors disabled:opacity-50"
                    >
                        {submitting ? "등록 중..." : "문제 등록"}
                    </button>
                </div>

                {/* 기존 문제 목록 */}
                <div>
                    <h2 className="docket-label text-[11px] text-[var(--text-faint)] mb-3">기존 문제</h2>
                    <div className="border border-[var(--rule)] divide-y divide-[var(--rule)]">
                        {existing.map((p) => (
                            <div key={p.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                                <span className="docket-label text-[10px] text-[var(--text-faint)]">
                                    № {String(p.id).padStart(3, "0")}
                                </span>
                                <span className="text-[var(--text)] flex-1">{p.title}</span>
                                <span className="docket-label text-[10px] text-[var(--text-dim)]">
                                    {DIFFICULTY_OPTIONS.find((d) => d.value === p.difficulty)?.label ?? "미분류"}
                                </span>
                            </div>
                        ))}
                        {existing.length === 0 && (
                            <div className="px-4 py-6 text-center text-[var(--text-dim)] text-sm">아직 등록된 문제가 없습니다.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
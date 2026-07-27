"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { ChevronLeft, X } from "lucide-react";
import clsx from "clsx";
import StampTag, { StampTone, statusLabel } from "@/components/StampTag";
import Editor from "@monaco-editor/react";
import { MONACO_LANGUAGE } from "@/lib/languages";

interface ContestProblem {
  id: number;
  title: string;
}

interface SubmissionRow {
  id: string;
  user_id: string;
  problem_id: number;
  status: string;
  code: string;
  language: string;
  created_at: string;
}

interface Participant {
  user_id: string;
  username: string;
}

const statusTone = (status: string): StampTone => {
  if (status === "Accepted") return "accept";
  if (status === "Pending" || status === "Running") return "pending";
  if (!status) return "neutral";
  return "reject";
};

export default function ContestResultsPage() {
  const params = useParams();
  const router = useRouter();
  const contestId = params.id as string;

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [contest, setContest] = useState<any>(null);
  const [problems, setProblems] = useState<ContestProblem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const [viewing, setViewing] = useState<{
    userId: string;
    problemId: number;
  } | null>(null);
  const [attemptIdx, setAttemptIdx] = useState(0);

  // 관리자 권한 확인
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
    if (!isAdmin || !contestId) return;

    (async () => {
      const [{ data: contestData }, { data: cp }, { data: subs }] =
        await Promise.all([
          supabase.from("contests").select("*").eq("id", contestId).single(),
          supabase
            .from("contest_problems")
            .select("order, problems(id, title)")
            .eq("contest_id", contestId)
            .order("order", { ascending: true }),
          supabase
            .from("submissions")
            .select(
              "id, user_id, problem_id, status, code, language, created_at",
            )
            .eq("contest_id", contestId)
            .order("created_at", { ascending: false }),
        ]);

      setContest(contestData);
      setProblems((cp || []).map((row: any) => row.problems).filter(Boolean));
      setSubmissions(subs || []);

      const userIds = Array.from(
        new Set((subs || []).map((s) => s.user_id).filter(Boolean)),
      );
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds);
        setParticipants(
          (profs || []).map((p) => ({ user_id: p.id, username: p.username })),
        );
      }

      setLoading(false);
    })();
  }, [isAdmin, contestId]);

  const matrix = useMemo(() => {
    const map = new Map<string, SubmissionRow[]>();
    submissions.forEach((s) => {
      const key = `${s.user_id}:${s.problem_id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [submissions]);

  const bestStatus = (userId: string, problemId: number): string | null => {
    const rows = matrix.get(`${userId}:${problemId}`);
    if (!rows || rows.length === 0) return null;
    const accepted = rows.find((r) => r.status === "Accepted");
    return accepted ? "Accepted" : rows[0].status; // rows[0] = 가장 최근 시도
  };

  const solvedCount = (userId: string) =>
    problems.filter((p) => bestStatus(userId, p.id) === "Accepted").length;

  const openViewer = (userId: string, problemId: number) => {
    setViewing({ userId, problemId });
    setAttemptIdx(0);
  };

  const currentAttempts = viewing
    ? matrix.get(`${viewing.userId}:${viewing.problemId}`) || []
    : [];
  const currentAttempt = currentAttempts[attemptIdx];
  const viewingUsername =
    participants.find((p) => p.user_id === viewing?.userId)?.username ??
    "알 수 없음";
  const viewingProblemTitle =
    problems.find((p) => p.id === viewing?.problemId)?.title ?? "";

  if (checking || (isAdmin && loading)) {
    return (
      <div className="h-screen bg-(--ink) flex items-center justify-center text-(--seal)">
        Loading...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen bg-(--ink) flex flex-col items-center justify-center gap-4 text-center px-6">
        <StampTag label="기각" tone="reject" size="lg" />
        <p className="text-(--text-dim)">
          관리자만 접근할 수 있는 화면입니다.
        </p>
      </div>
    );
  }

  const selectedParticipant = participants.find(
    (p) => p.user_id === selectedUser,
  );

  return (
    <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 bg-(--ink) min-h-[calc(100vh-64px)]">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/admin/contests"
          className="docket-label text-[11px] text-(--text-dim) hover:text-(--text) transition-colors inline-flex items-center gap-1 mb-6"
        >
          <ChevronLeft size={14} /> 콘테스트 관리로
        </Link>

        <div className="mb-8 border-b border-(--rule) pb-4">
          <div className="docket-label text-[11px] text-(--text-faint) mb-1">
            Verdict Record
          </div>
          <h1 className="text-2xl font-semibold text-(--text)">
            {contest?.title} · 심리 결과
          </h1>
          <p className="text-(--text-dim) text-sm mt-1">
            참가자 {participants.length}명 · 문제 {problems.length}개
          </p>
        </div>

        {/* 1단계: 참가자 목록 (이름 + 점수만) */}
        {!selectedUser &&
          (participants.length === 0 ? (
            <div className="text-center py-20 bg-(--paper) border border-(--rule)">
              <p className="text-(--text-dim)">
                아직 제출한 참가자가 없습니다.
              </p>
            </div>
          ) : (
            <div className="bg-(--paper) border border-(--rule) overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-(--paper-raised) docket-label text-[10px] text-(--text-dim) border-b border-(--rule)">
                  <tr>
                    <th className="px-6 py-3 w-16 text-center">순위</th>
                    <th className="px-6 py-3">참가자</th>
                    <th className="px-6 py-3 w-32 text-center">해결</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--rule)">
                  {participants
                    .slice()
                    .sort(
                      (a, b) => solvedCount(b.user_id) - solvedCount(a.user_id),
                    )
                    .map((participant, i) => (
                      <tr
                        key={participant.user_id}
                        onClick={() => setSelectedUser(participant.user_id)}
                        className="hover:bg-(--paper-raised) cursor-pointer transition-colors border-l-2 border-l-transparent hover:border-l-(--seal)"
                      >
                        <td className="px-6 py-3.5 text-center docket-label text-[13px] text-(--text-dim)">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="px-6 py-3.5 font-medium text-(--text)">
                          {participant.username}
                        </td>
                        <td className="px-6 py-3.5 text-center font-mono text-(--text)">
                          {solvedCount(participant.user_id)}/{problems.length}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}

        {/* 2단계: 선택한 참가자의 문제별 판정 표 */}
        {selectedUser && selectedParticipant && (
          <div>
            <button
              onClick={() => setSelectedUser(null)}
              className="docket-label text-[11px] text-(--text-dim) hover:text-(--text) transition-colors inline-flex items-center gap-1 mb-5"
            >
              <ChevronLeft size={14} /> 참가자 목록으로
            </button>

            <div className="mb-5">
              <div className="docket-label text-[11px] text-(--text-faint) mb-1">
                Participant
              </div>
              <h2 className="text-xl font-semibold text-(--text)">
                {selectedParticipant.username}
              </h2>
              <p className="text-(--text-dim) text-sm mt-1">
                {solvedCount(selectedUser)}/{problems.length}문제 해결
              </p>
            </div>

            <div className="bg-(--paper) border border-(--rule) overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-(--paper-raised) docket-label text-[10px] text-(--text-dim) border-b border-(--rule)">
                  <tr>
                    <th className="px-6 py-3 w-28">사건번호</th>
                    <th className="px-6 py-3">제목</th>
                    <th className="px-6 py-3 w-32 text-center">판정</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--rule)">
                  {problems.map((p) => {
                    const status = bestStatus(selectedUser, p.id);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => status && openViewer(selectedUser, p.id)}
                        className={clsx(
                          "transition-colors border-l-2 border-l-transparent",
                          status
                            ? "hover:bg-(--paper-raised) cursor-pointer hover:border-l-(--seal)"
                            : "opacity-60",
                        )}
                      >
                        <td className="px-6 py-3.5 docket-label text-[11px] text-(--text-dim)">
                          № {String(p.id).padStart(3, "0")}
                        </td>
                        <td className="px-6 py-3.5 text-(--text)">
                          {p.title}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {status ? (
                            <StampTag
                              label={statusLabel(status)}
                              tone={statusTone(status)}
                              size="sm"
                            />
                          ) : (
                            <span className="text-(--text-faint) text-xs">
                              미제출
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 코드 열람 패널 */}
      {viewing && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-(--paper) border border-(--rule) w-full max-w-3xl h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--rule)">
              <div>
                <div className="docket-label text-[10px] text-(--text-faint)">
                  {viewingUsername}
                </div>
                <div className="text-(--text) font-semibold">
                  {viewingProblemTitle}
                </div>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="text-(--text-dim) hover:text-(--text)"
              >
                <X size={20} />
              </button>
            </div>

            {/* 시도 여러 번이면 탭으로 전환 */}
            {currentAttempts.length > 1 && (
              <div className="flex gap-1 px-5 pt-3 flex-wrap">
                {currentAttempts.map((a, i) => (
                  <button
                    key={a.id}
                    onClick={() => setAttemptIdx(i)}
                    className={clsx(
                      "docket-label text-[10px] px-3 py-1.5 border transition-colors",
                      i === attemptIdx
                        ? "border-(--seal) text-(--seal) bg-(--seal)/10"
                        : "border-(--rule) text-(--text-dim) hover:text-(--text)",
                    )}
                  >
                    #{currentAttempts.length - i}
                  </button>
                ))}
              </div>
            )}

            {currentAttempt && (
              <div className="flex-1 min-h-0 flex flex-col p-5">
                <div className="flex items-center gap-3 mb-3 shrink-0">
                  <StampTag
                    label={statusLabel(currentAttempt.status)}
                    tone={statusTone(currentAttempt.status)}
                    size="sm"
                  />
                  <span className="docket-label text-[10px] text-(--text-faint)">
                    {currentAttempt.language} ·{" "}
                    {new Date(currentAttempt.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="h-105 border border-(--rule) overflow-hidden shrink-0">
                  <Editor
                    key={currentAttempt.id}
                    height="420px"
                    language={
                      MONACO_LANGUAGE[currentAttempt.language] ?? "plaintext"
                    }
                    theme="vs-dark"
                    value={currentAttempt.code}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      scrollBeyondLastLine: false,
                      padding: { top: 12 },
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AdminGate from "@/components/AdminGate";
import CodeEditor from "@/components/CodeEditor";
import Verdict from "@/components/Verdict";
import { formatDateTime } from "@/lib/format";
import { LANGUAGE_LABELS } from "@/lib/languages";
import type { Contest } from "@/lib/types";

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

const letter = (index: number) => String.fromCharCode(65 + (index % 26));

export default function ContestResultsPage() {
  const params = useParams();
  const contestId = params.id as string;
  const { checking, isAdmin } = useIsAdmin();

  const [contest, setContest] = useState<Contest | null>(null);
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
            .order("order", { ascending: true })
            .returns<{ order: number; problems: ContestProblem | null }[]>(),
          supabase
            .from("submissions")
            .select(
              "id, user_id, problem_id, status, code, language, created_at",
            )
            .eq("contest_id", contestId)
            .order("created_at", { ascending: false }),
        ]);

      setContest(contestData);
      setProblems((cp || []).flatMap((row) => row.problems ? [row.problems] : []));
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

  useEffect(() => {
    if (!viewing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewing(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewing]);

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

  if (checking || !isAdmin) return <AdminGate checking={checking} isAdmin={isAdmin} />;
  if (loading) return <p role="status" className="notice page">대회 결과를 불러오는 중…</p>;

  const currentAttempts = viewing
    ? matrix.get(`${viewing.userId}:${viewing.problemId}`) || []
    : [];
  const currentAttempt = currentAttempts[attemptIdx];
  const viewingUsername =
    participants.find((p) => p.user_id === viewing?.userId)?.username ?? "이름 없음";
  const viewingProblemTitle =
    problems.find((p) => p.id === viewing?.problemId)?.title ?? "";
  const selectedParticipant = participants.find((p) => p.user_id === selectedUser);

  return (
    <div className="page">
      <Link href="/admin/contests" className="btn btn-sm btn-line pl-2.5">
        <ChevronLeft size={16} aria-hidden="true" />
        대회 관리
      </Link>

      <h1 className="page-title mt-6">{contest?.title ?? "대회"} 결과</h1>
      <p className="page-lead">
        제출한 사람 {participants.length}명, 문제 {problems.length}개. 이름을 누르면 문제별 결과와 코드를 볼 수 있습니다.
      </p>

      {!selectedParticipant ? (
        <div className="sheet mt-8 overflow-hidden">
          {participants.length === 0 ? (
            <p className="notice p-8">아직 제출한 사람이 없습니다.</p>
          ) : (
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="w-20">순위</th>
                  <th>이름</th>
                  <th className="num w-36 pr-9!">맞힌 문제</th>
                </tr>
              </thead>
              <tbody>
                {participants
                  .slice()
                  .sort((a, b) => solvedCount(b.user_id) - solvedCount(a.user_id))
                  .map((participant, i) => (
                    <tr key={participant.user_id} className="row-link relative">
                      <td className="font-extrabold tabular-nums">{i + 1}</td>
                      <td>
                        <button className="font-bold after:absolute after:inset-0" onClick={() => setSelectedUser(participant.user_id)}>
                          {participant.username}
                        </button>
                      </td>
                      <td className="num py-1! pr-9!">
                        <span className="hand text-[28px]">{solvedCount(participant.user_id)}</span>
                        <span className="text-pencil"> / {problems.length}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <section className="mt-10" aria-labelledby="participant-name">
          <button onClick={() => setSelectedUser(null)} className="btn btn-sm btn-line pl-2.5">
            <ChevronLeft size={16} aria-hidden="true" />
            전체 순위
          </button>
          <h2 id="participant-name" className="section-title mt-5">{selectedParticipant.username}</h2>
          <p className="text-pencil">
            {problems.length}문제 중 {solvedCount(selectedParticipant.user_id)}문제를 맞혔습니다. 제출한 문제를 누르면 코드가 열립니다.
          </p>

          <div className="sheet mt-5 overflow-hidden">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="w-20">문제</th>
                  <th>제목</th>
                  <th className="w-44">결과</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((p, i) => {
                  const status = bestStatus(selectedParticipant.user_id, p.id);
                  return (
                    <tr key={p.id} className={status ? "row-link relative" : undefined}>
                      <td className="font-extrabold">{letter(i)}</td>
                      <td>
                        {status ? (
                          <button className="font-bold after:absolute after:inset-0" onClick={() => openViewer(selectedParticipant.user_id, p.id)}>
                            {p.title}
                          </button>
                        ) : (
                          <span className="text-pencil">{p.title}</span>
                        )}
                      </td>
                      <td className="py-2!">
                        {status ? <Verdict status={status} size="sm" /> : <span className="text-sm text-pencil">제출 없음</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-marker/60 p-4" onClick={() => setViewing(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="viewer-title"
            className="sheet-plain flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id="viewer-title" className="section-title truncate">{viewingProblemTitle}</h2>
                <p className="text-sm text-pencil">{viewingUsername}의 제출</p>
              </div>
              <button onClick={() => setViewing(null)} aria-label="닫기" title="닫기" className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full text-pencil hover:bg-tint hover:text-marker">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {currentAttempts.length > 1 && (
              <div role="group" aria-label="제출 고르기" className="flex flex-wrap gap-0.5 border-b border-line px-3 py-1.5">
                {currentAttempts.map((a, i) => (
                  <button key={a.id} className="choice choice-sm" aria-pressed={i === attemptIdx} onClick={() => setAttemptIdx(i)}>
                    {currentAttempts.length - i}번째
                  </button>
                ))}
              </div>
            )}

            {currentAttempt && (
              <>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3">
                  <Verdict status={currentAttempt.status} size="sm" />
                  <span className="text-sm">{LANGUAGE_LABELS[currentAttempt.language] ?? currentAttempt.language}</span>
                  <span className="text-sm text-pencil">{formatDateTime(currentAttempt.created_at)}</span>
                </div>
                <div className="border-t border-line">
                  <CodeEditor
                    key={currentAttempt.id}
                    height="min(420px, 55dvh)"
                    language={currentAttempt.language}
                    value={currentAttempt.code}
                    readOnly
                    fontSize={14}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

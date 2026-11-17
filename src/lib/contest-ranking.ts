// 대회 결과 순위 계산.
// 1. 맞힌 문제가 많을수록 앞.
// 2. 같으면 마지막으로 맞힌 시각(맞힌 문제마다 처음 정답을 낸 시각 중 가장 늦은 것)이
//    이를수록 앞. 같은 개수를 더 빨리 끝낸 사람이 이긴다.
// 3. 둘 다 같으면 같은 순위.

export interface RankingSubmission {
  user_id: string;
  problem_id: number;
  status: string;
  created_at: string;
}

export interface RankedParticipant {
  user_id: string;
  rank: number;
  solved: number;
  /** 마지막으로 맞힌 시각(ms). 맞힌 문제가 없으면 null */
  finishedAt: number | null;
}

export function rankParticipants(
  submissions: RankingSubmission[],
  problemIds: number[],
): RankedParticipant[] {
  const inContest = new Set(problemIds);
  const firstAccept = new Map<string, Map<number, number>>();

  for (const sub of submissions) {
    if (!firstAccept.has(sub.user_id)) firstAccept.set(sub.user_id, new Map());
    if (sub.status !== "Accepted" || !inContest.has(sub.problem_id)) continue;
    const solved = firstAccept.get(sub.user_id)!;
    const at = new Date(sub.created_at).getTime();
    const previous = solved.get(sub.problem_id);
    if (previous === undefined || at < previous) solved.set(sub.problem_id, at);
  }

  const rows = [...firstAccept].map(([user_id, solved]) => ({
    user_id,
    solved: solved.size,
    finishedAt: solved.size ? Math.max(...solved.values()) : null,
  }));

  rows.sort(
    (a, b) =>
      b.solved - a.solved ||
      (a.finishedAt ?? 0) - (b.finishedAt ?? 0) ||
      a.user_id.localeCompare(b.user_id),
  );

  let rank = 0;
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    if (!previous || previous.solved !== row.solved || previous.finishedAt !== row.finishedAt) {
      rank = index + 1;
    }
    return { ...row, rank };
  });
}

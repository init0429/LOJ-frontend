// 회원 홈에 보여 줄 내 기록을 제출 목록에서 계산한다. 화면과 떼어 두어 테스트할 수 있게 했다.

export interface MySubmission {
  problem_id: number;
  status: string;
  created_at: string;
}

export interface MyStats {
  /** 맞힌 문제 수(같은 문제는 한 번) */
  solved: number;
  /** 채점이 끝난 제출 수 */
  submissions: number;
  /** 채점이 끝난 제출 중 정답 비율(0~100, 반올림). 제출이 없으면 null */
  acceptance: number | null;
}

const judging = (status: string) => status === "Pending" || status === "Running";

/**
 * 내 기록. countable을 주면 푼 문제는 그 문제들만 센다(문제 목록에 공개된 문제. 대회 전용 문제는
 * 대회가 끝나 공개되기 전까지 "푼 문제 n / 전체"에 넣지 않는다). 제출 수와 정답률은 모든 제출로 센다.
 */
export function summarize(submissions: MySubmission[], countable?: Set<number>): MyStats {
  const finished = submissions.filter((sub) => !judging(sub.status));
  const accepted = finished.filter((sub) => sub.status === "Accepted");
  const solved = new Set(accepted.map((sub) => sub.problem_id));
  return {
    solved: countable ? [...solved].filter((id) => countable.has(id)).length : solved.size,
    submissions: finished.length,
    acceptance: finished.length ? Math.round((accepted.length / finished.length) * 100) : null,
  };
}

/** 시도했지만 아직 맞히지 못한 문제를 최근에 손댄 순서로 */
export function unsolvedAttempts(submissions: MySubmission[], limit = 3): number[] {
  const solved = new Set(submissions.filter((sub) => sub.status === "Accepted").map((sub) => sub.problem_id));
  const latest = new Map<number, string>();
  for (const sub of submissions) {
    if (solved.has(sub.problem_id)) continue;
    const seen = latest.get(sub.problem_id);
    if (!seen || sub.created_at > seen) latest.set(sub.problem_id, sub.created_at);
  }
  return [...latest.entries()]
    .sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0))
    .slice(0, limit)
    .map(([problemId]) => problemId);
}

/**
 * 순위 표(점수 높은 순)에서 내 자리. 순위 화면과 같이 줄 순서대로 센다.
 * 아직 점수가 없으면(맞힌 문제가 없으면) null
 */
export function myRank(
  rows: { user_id: string; rating: number | null }[],
  userId: string,
): { rank: number; rating: number; total: number } | null {
  const index = rows.findIndex((row) => row.user_id === userId);
  if (index < 0 || !rows[index].rating) return null;
  return { rank: index + 1, rating: rows[index].rating ?? 0, total: rows.length };
}

export interface ContestSummary {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
}

/** 진행 중인 대회(곧 끝나는 것부터), 이어서 예정된 대회(곧 시작하는 것부터) */
export function activeContests<T extends ContestSummary>(contests: T[], now: number, limit = 3): T[] {
  const time = (iso: string) => new Date(iso).getTime();
  const ongoing = contests
    .filter((c) => time(c.start_time) <= now && now < time(c.end_time))
    .sort((a, b) => time(a.end_time) - time(b.end_time));
  const upcoming = contests
    .filter((c) => now < time(c.start_time))
    .sort((a, b) => time(a.start_time) - time(b.start_time));
  return [...ongoing, ...upcoming].slice(0, limit);
}

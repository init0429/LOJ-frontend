/** 관리 화면에서 문제를 부르는 말. 대회 전용 문제는 임시 번호(10억대) 대신 "대회 전용"이라고 쓴다. */
export function problemLabel(problem: { id: number; title: string; contest_only?: boolean | null }): string {
  return problem.contest_only ? `대회 전용 “${problem.title}”` : `${problem.id}번 “${problem.title}”`;
}

/**
 * 대회 개설 화면에서 고를 수 있는 문제: 공개 문제와, 아직 어느 대회에도 들어가지 않은 대회 전용 문제.
 * 다른 대회에 들어간 대회 전용 문제는 그 대회가 끝나야 공개되므로 다시 고르지 않는다.
 */
export function pickableProblems<T extends { id: number; contest_only?: boolean | null }>(
  problems: T[],
  linkedIds: Iterable<number>,
): T[] {
  const linked = new Set(linkedIds);
  return problems.filter((problem) => !problem.contest_only || !linked.has(problem.id));
}

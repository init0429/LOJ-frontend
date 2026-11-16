export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;

const LABELS: Record<number, string> = {
  1: "아주 쉬움",
  2: "쉬움",
  3: "보통",
  4: "어려움",
  5: "아주 어려움",
};

export const difficultyLabel = (difficulty: number | null | undefined) =>
  (difficulty && LABELS[difficulty]) || "미정";

// 아직 옮기지 않은 화면이 쓰는 이전 함수. 화면 이전이 끝나면 지운다.
export const getDifficultyMeta = (difficulty: number | null | undefined) => ({
  label: difficultyLabel(difficulty),
  color: "var(--marker)",
});

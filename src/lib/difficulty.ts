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

/** 색 묶음. 1~2 쉬움, 3 보통, 4~5 어려움 */
export const difficultyTone = (difficulty: number | null | undefined) => {
  if (!difficulty || !LABELS[difficulty]) return "none" as const;
  if (difficulty <= 2) return "easy" as const;
  if (difficulty === 3) return "medium" as const;
  return "hard" as const;
};

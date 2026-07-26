export const DIFFICULTY_META: Record<number, { label: string; color: string }> = {
    1: { label: "경범죄", color: "var(--sev-1)" },
    2: { label: "단순범죄", color: "var(--sev-2)" },
    3: { label: "일반범죄", color: "var(--sev-3)" },
    4: { label: "중범죄", color: "var(--sev-4)" },
    5: { label: "흉악범죄", color: "var(--sev-5)" },
};

export const getDifficultyMeta = (difficulty: number | null | undefined) => {
    if (!difficulty || !DIFFICULTY_META[difficulty]) {
        return { label: "미분류", color: "var(--text-faint)" };
    }
    return DIFFICULTY_META[difficulty];
};
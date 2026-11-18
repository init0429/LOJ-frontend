// solved.ac 티어 번호(0~31)를 이름으로 바꾼다. 0은 Unrated, 1~30은 Bronze V부터 Ruby I까지
// 다섯 칸씩, 31은 Master(사용자 티어에만 있음).
const GROUPS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ruby"] as const;
const STEPS = ["V", "IV", "III", "II", "I"] as const;

export type TierGroup = (typeof GROUPS)[number] | "Unrated" | "Master";

export function tierGroup(tier: number): TierGroup {
  if (tier >= 31) return "Master";
  if (tier >= 1 && tier <= 30) return GROUPS[Math.floor((tier - 1) / 5)];
  return "Unrated";
}

export function tierName(tier: number | null | undefined): string {
  if (tier == null || !Number.isInteger(tier)) return "알 수 없음";
  const group = tierGroup(tier);
  if (group === "Unrated" || group === "Master") return group;
  return `${group} ${STEPS[(tier - 1) % 5]}`;
}

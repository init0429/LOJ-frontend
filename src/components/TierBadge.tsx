import { tierGroup, tierName } from "@/lib/solvedac-tier";

// solved.ac에서 쓰는 티어 색. 글자는 본문 색으로 두고 앞의 점만 칠한다(어느 바탕에서도 읽히게).
const COLORS: Record<string, string> = {
  Unrated: "#8a8a8a",
  Bronze: "#ad5600",
  Silver: "#5d7a96",
  Gold: "#ec9a00",
  Platinum: "#27e2a4",
  Diamond: "#00b4fc",
  Ruby: "#ff0062",
  Master: "#b491ff",
};

/** solved.ac 티어. 색 점과 이름 */
export default function TierBadge({ tier }: { tier: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: COLORS[tierGroup(tier)] }} />
      {tierName(tier)}
    </span>
  );
}

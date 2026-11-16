import type { VerdictKind } from "@/lib/verdict";

// 빨간 펜으로 그은 채점 표시. 정답은 동그라미, 그 밖의 결과는 빗금.
// 손으로 그은 선이라 시작과 끝이 딱 맞지 않게 둔다.
const PATHS: Record<Exclude<VerdictKind, "waiting">, string> = {
  correct:
    "M57 9C31 4 8 22 7 49c-1 27 20 45 45 44 25-1 43-21 41-46C91 23 71 7 44 12",
  wrong: "M84 12C62 36 38 64 15 90",
};

export default function GradeMark({
  kind,
  draw = false,
  className = "",
}: {
  kind: VerdictKind;
  /** 판정이 방금 나왔을 때만 true. 선이 한 번 그려진다. */
  draw?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={`overflow-visible ${kind === "waiting" ? "text-pencil" : "text-pen"} ${className}`}
    >
      {kind === "waiting" ? (
        <circle cx="50" cy="50" r="41" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="2 13" />
      ) : (
        <path
          className="grade-stroke"
          data-draw={draw}
          d={PATHS[kind]}
          pathLength={1}
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

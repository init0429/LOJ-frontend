import { DIFFICULTY_LEVELS, difficultyLabel } from "@/lib/difficulty";

/** 난이도 1~5를 사인펜으로 채운 버블 개수로 보여 준다. */
export default function Difficulty({
  value,
  showLabel = false,
}: {
  value: number | null | undefined;
  showLabel?: boolean;
}) {
  const label = difficultyLabel(value);
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span
        role="img"
        aria-label={value ? `난이도 5단계 중 ${value}단계, ${label}` : "난이도 미정"}
        title={label}
        className="inline-flex gap-[3px]"
      >
        {DIFFICULTY_LEVELS.map((level) => (
          <span key={level} className="bubble" data-on={!!value && level <= value} />
        ))}
      </span>
      {showLabel && <span className="text-sm text-pencil">{label}</span>}
    </span>
  );
}

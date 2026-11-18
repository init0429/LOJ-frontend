import { difficultyLabel, difficultyTone } from "@/lib/difficulty";

const TONES = { easy: "text-easy", medium: "text-medium", hard: "text-hard", none: "text-muted" };

/** 난이도. 쉬움은 청록, 보통은 노랑, 어려움은 빨강 글자. chip이면 둥근 꼬리표로 감싼다. */
export default function Difficulty({ value, chip = false }: { value: number | null | undefined; chip?: boolean }) {
  const tone = TONES[difficultyTone(value)];
  return (
    <span className={`whitespace-nowrap font-medium ${tone} ${chip ? "chip" : ""}`}>
      {difficultyLabel(value)}
    </span>
  );
}

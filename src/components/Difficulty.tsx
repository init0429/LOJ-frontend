import { difficultyLabel } from "@/lib/difficulty";

export default function Difficulty({ value }: { value: number | null | undefined }) {
  return <span className="whitespace-nowrap">{difficultyLabel(value)}</span>;
}

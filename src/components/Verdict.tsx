import { verdictKind, verdictLabel } from "@/lib/verdict";

const SIZES = { sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl" };
const COLORS = { correct: "text-ok", wrong: "text-bad", waiting: "text-muted" };

/** 채점 결과 한 건. 정답은 초록, 그 밖의 결과는 빨강, 기다리는 중은 회색 글자. */
export default function Verdict({
  status,
  size = "md",
}: {
  status: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span className={`font-semibold whitespace-nowrap ${SIZES[size]} ${COLORS[verdictKind(status)]}`}>
      {verdictLabel(status)}
    </span>
  );
}

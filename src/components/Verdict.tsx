import GradeMark from "@/components/GradeMark";
import { verdictKind, verdictLabel } from "@/lib/verdict";

const SIZES = {
  sm: { mark: "w-5 h-5", text: "text-[22px]", gap: "gap-1.5" },
  md: { mark: "w-8 h-8", text: "text-[32px]", gap: "gap-2" },
  lg: { mark: "w-16 h-16", text: "text-[56px]", gap: "gap-4" },
};

/** 채점 결과 한 건: 빨간 펜 표시와 손글씨 판정. */
export default function Verdict({
  status,
  size = "md",
  draw = false,
}: {
  status: string;
  size?: keyof typeof SIZES;
  draw?: boolean;
}) {
  const kind = verdictKind(status);
  const s = SIZES[size];
  return (
    <span className={`inline-flex items-center ${s.gap}`}>
      <GradeMark kind={kind} draw={draw} className={`${s.mark} flex-none`} />
      <span className={`hand ${s.text} ${kind === "waiting" ? "text-pencil!" : ""} whitespace-nowrap`}>
        {verdictLabel(status)}
      </span>
    </span>
  );
}

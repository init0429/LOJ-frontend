import GradeMark from "@/components/GradeMark";

/**
 * 문제 번호. 채점된 시험지처럼, 맞힌 문제는 번호에 동그라미가,
 * 틀린 문제는 빗금이 그어진다.
 */
export default function ProblemNumber({
  id,
  mark = null,
  size = "md",
}: {
  id: number;
  mark?: "correct" | "wrong" | null;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "w-14 h-14 text-2xl" : "w-9 h-9 text-[15px]";
  return (
    <span className={`relative inline-flex flex-none items-center justify-center font-extrabold tabular-nums ${box}`}>
      {id}
      {mark && (
        <>
          <GradeMark kind={mark} className="absolute -inset-1" />
          <span className="sr-only">{mark === "correct" ? " (맞힌 문제)" : " (틀린 문제)"}</span>
        </>
      )}
    </span>
  );
}

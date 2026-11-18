import Difficulty from "@/components/Difficulty";
import TierBadge from "@/components/TierBadge";

/**
 * 문제의 난이도. solved.ac 티어가 있으면 티어로, 없으면 LOJ의 5단계 난이도로 보여 준다.
 * 화면마다 표기가 갈리지 않도록 문제 난이도는 모두 이것으로 그린다.
 */
export default function ProblemLevel({
  tier,
  difficulty,
  chip = false,
}: {
  tier?: number | null;
  difficulty: number | null | undefined;
  chip?: boolean;
}) {
  if (tier && tier > 0) {
    return chip ? <span className="chip text-fg"><TierBadge tier={tier} /></span> : <TierBadge tier={tier} />;
  }
  return <Difficulty value={difficulty} chip={chip} />;
}

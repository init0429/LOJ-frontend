import { supabase } from "./supabase";
import type { Tag } from "./tag-search";

/** 문제에 붙이는 solved.ac 정보. 관리자 화면의 입력 칸과 같은 모양이다. */
export interface SolvedacInfo {
  /** BOJ 문제 번호 칸의 글자 그대로. 비어 있으면 BOJ 문제가 아니다. */
  bojId: string;
  /** 0 Unrated, 1~30 Bronze V~Ruby I. null이면 정하지 않음 */
  tier: number | null;
  tags: string[];
}

export const emptySolvedacInfo = (): SolvedacInfo => ({ bojId: "", tier: null, tags: [] });

export const hasSolvedacInfo = (info: SolvedacInfo) =>
  info.bojId.trim() !== "" || info.tier !== null || info.tags.length > 0;

export async function loadTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("key, name_ko, name_en, aliases")
    .order("name_ko");
  if (error) throw error;
  return (data ?? []) as Tag[];
}

/**
 * 문제의 티어·BOJ 번호와 태그를 저장한다. 태그는 지금 고른 것으로 바꾼다.
 * 두 표에 나눠 쓰므로 중간에 실패하면 일부만 바뀔 수 있다. 오류를 보여 주고 다시 저장하면 된다.
 */
export async function saveProblemSolvedac(problemId: number, info: SolvedacInfo, bojId: number | null) {
  const { error: problemError } = await supabase
    .from("problems")
    .update({ solvedac_tier: info.tier, boj_problem_id: bojId })
    .eq("id", problemId);
  if (problemError) throw problemError;

  const { error: clearError } = await supabase.from("problem_tags").delete().eq("problem_id", problemId);
  if (clearError) throw clearError;
  if (info.tags.length > 0) {
    const { error: tagError } = await supabase
      .from("problem_tags")
      .insert(info.tags.map((tag_key) => ({ problem_id: problemId, tag_key })));
    if (tagError) throw tagError;
  }
}

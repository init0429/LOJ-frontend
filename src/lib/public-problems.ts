import { fetchAllRows } from "./fetch-all";
import { supabase } from "./supabase";

/**
 * 문제 목록에 공개된 문제 번호. 대회 전용 문제(대회가 끝나 공개되기 전)는 뺀다.
 * DB에 contest_only 칸이 없으면(마이그레이션 전) 읽을 수 있는 문제를 모두 센다. 못 읽으면 null
 */
export async function fetchPublicProblemIds(): Promise<number[] | null> {
  const read = (filtered: boolean) =>
    fetchAllRows<{ id: number }>((from, to) => {
      const query = supabase.from("problems").select("id");
      return (filtered ? query.eq("contest_only", false) : query).order("id").range(from, to);
    });
  let result = await read(true);
  if (result.error) result = await read(false);
  return result.error ? null : result.data.map((row) => row.id);
}

/** 공개된 문제 수. 못 세면 null */
export async function countPublicProblems(): Promise<number | null> {
  const filtered = await supabase.from("problems").select("id", { count: "exact", head: true }).eq("contest_only", false);
  if (!filtered.error) return filtered.count ?? null;
  const all = await supabase.from("problems").select("id", { count: "exact", head: true });
  return all.error ? null : all.count ?? null;
}

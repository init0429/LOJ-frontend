import { supabase } from "./supabase";

export interface NamedTag {
  key: string;
  name: string;
}

export interface Recommendations {
  basis: {
    /** 티어를 어디서 알았는지. null이면 아직 모른다. */
    source: "solvedac" | "loj" | null;
    tier: number | null;
    linked: boolean;
    handle: string | null;
    synced_at: string | null;
  };
  /** 기록이 하나도 없어서 쉬운 문제부터 준 경우 */
  starter: boolean;
  weak_tags: NamedTag[];
  loj: { id: number; title: string; tier: number | null; difficulty: number | null; tags: NamedTag[] }[];
  boj: { problem_id: number; title: string; tier: number; tags: NamedTag[]; url: string }[];
}

export async function getRecommendations(): Promise<Recommendations> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error("로그인이 필요합니다.");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/recommendations`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (data as { detail?: unknown }).detail;
    throw new Error(typeof detail === "string" ? detail : `서버 통신 오류 (${response.status})`);
  }
  const result = data as Recommendations;
  if (!result.basis || !Array.isArray(result.loj) || !Array.isArray(result.boj)) {
    throw new Error("추천 결과를 받지 못했습니다.");
  }
  return result;
}

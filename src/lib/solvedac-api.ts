import { supabase } from "./supabase";

export interface SolvedacStatus {
  configured: boolean;
  linked: boolean;
  handle?: string;
  status?: "active" | "expired";
  tier?: number | null;
  rating?: number | null;
  solved_count?: number | null;
}

// 연동을 마친 뒤 백엔드가 설정 화면으로 돌려보낼 때 붙이는 ?solvedac= 값과 안내 문구
export const LINK_RESULTS: Record<string, { ok: boolean; message: string }> = {
  linked: { ok: true, message: "solved.ac 계정을 연결했습니다." },
  denied: { ok: false, message: "solved.ac에서 연결을 취소했습니다." },
  expired: { ok: false, message: "연결 시간(10분)이 지났거나 이미 쓴 링크입니다. 다시 연결해 주세요." },
  browser: { ok: false, message: "연결을 시작한 브라우저에서 마쳐야 합니다. 이 화면에서 다시 연결해 주세요." },
  taken: { ok: false, message: "이 solved.ac 계정은 이미 다른 LOJ 계정에 연결되어 있습니다." },
  failed: { ok: false, message: "연결하지 못했습니다. 잠시 후 다시 시도해 주세요." },
  unavailable: { ok: false, message: "solved.ac 연동이 아직 준비되지 않았습니다." },
};

async function request(method: "GET" | "POST" | "DELETE", path: string): Promise<unknown> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error("로그인이 필요합니다.");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const response = await fetch(`${apiUrl.replace(/\/$/, "")}/integrations/solvedac${path}`, {
    method,
    headers: { Authorization: `Bearer ${session.access_token}` },
    // 연동을 시작할 때 백엔드가 이 브라우저에 심는 쿠키를 받아 두어야 콜백이 통과한다.
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = (data as { detail?: unknown }).detail;
    throw new Error(typeof detail === "string" ? detail : `서버 통신 오류 (${response.status})`);
  }
  return data;
}

export async function getSolvedacStatus(): Promise<SolvedacStatus> {
  return (await request("GET", "")) as SolvedacStatus;
}

/** solved.ac 승인 화면 주소. 받은 뒤 그 주소로 이동하면 된다. */
export async function startSolvedacLink(): Promise<string> {
  const data = (await request("POST", "/start")) as { authorize_url?: unknown };
  if (typeof data.authorize_url !== "string" || !data.authorize_url.startsWith("https://")) {
    throw new Error("solved.ac 연결 주소를 받지 못했습니다.");
  }
  return data.authorize_url;
}

export async function unlinkSolvedac(): Promise<void> {
  await request("DELETE", "");
}

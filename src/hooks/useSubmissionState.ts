import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { isJudging } from "@/lib/verdict";

// 처음엔 1초마다 묻다가 점점 간격을 늘리고, 이 시간이 지나도 결과가 없으면 그만 묻는다.
// 채점기가 멈춰도 브라우저가 끝없이 DB를 두드리지 않게 하기 위함.
const FIRST_DELAY_MS = 1000;
const MAX_DELAY_MS = 5000;
const GIVE_UP_AFTER_MS = 3 * 60 * 1000;

/** 채점 결과를 더 기다리지 않을 때 돌려주는 상태. 화면에서 안내 문구로 바꿔 보여 준다. */
export const POLL_GAVE_UP = "Unknown";

export function useSubmissionState(subId: string | null) {
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    if (!subId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    let delay = FIRST_DELAY_MS;

    const pollStatus = async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select("status")
        .eq("id", subId)
        .single();

      if (cancelled) return;
      if (error) {
        console.error("상태 조회 에러:", error);
      }

      if (data) {
        setResult({ id: subId, status: data.status });
        if (!isJudging(data.status)) return;
      }

      if (Date.now() - startedAt >= GIVE_UP_AFTER_MS) {
        setResult({ id: subId, status: POLL_GAVE_UP });
        return;
      }
      timer = setTimeout(pollStatus, delay);
      delay = Math.min(delay * 1.5, MAX_DELAY_MS);
    };

    void pollStatus();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [subId]);

  if (!subId) return "";
  return result?.id === subId ? result.status : "Pending";
}

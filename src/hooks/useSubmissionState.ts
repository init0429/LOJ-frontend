import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { parseFeedback } from "@/lib/submission-feedback";
import type { SubmissionFeedback } from "@/lib/types";
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

/**
 * 판정이 나온 제출의 채점 설명(몇 번째 테스트에서 틀렸는지 등)을 한 번 읽는다.
 * 채점기가 판정과 설명을 한 번에 쓰므로 판정이 보이면 설명도 이미 있다.
 * 읽지 못하면(설명 칸이 아직 없는 DB 등) null이고, 화면은 판정만 보여 준다.
 */
export function useSubmissionFeedback(subId: string | null, status: string) {
  const [loaded, setLoaded] = useState<{ id: string; feedback: SubmissionFeedback | null } | null>(null);
  const finished = !!subId && status !== "" && !isJudging(status) && status !== POLL_GAVE_UP;

  useEffect(() => {
    if (!subId || !finished) return;
    let cancelled = false;
    supabase
      .from("submissions")
      .select("feedback")
      .eq("id", subId)
      .single()
      .then(
        ({ data }) => {
          if (!cancelled) setLoaded({ id: subId, feedback: parseFeedback(data?.feedback) });
        },
        () => {
          if (!cancelled) setLoaded({ id: subId, feedback: null });
        },
      );
    return () => {
      cancelled = true;
    };
  }, [subId, finished]);

  return finished && loaded?.id === subId ? loaded.feedback : null;
}

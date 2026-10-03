import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useSubmissionState(subId: string | null) {
  const [result, setResult] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    if (!subId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

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
        if (
          [
            "Accepted",
            "Wrong Answer",
            "Time Limit Exceeded",
            "Runtime Error",
            "Compile Error",
            "System Error",
          ].includes(data.status)
        ) {
          return;
        }
      }
      timer = setTimeout(pollStatus, 1000);
    };

    void pollStatus();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [subId]);

  if (!subId) return "코드 작성 중";
  return result?.id === subId ? result.status : "Pending";
}

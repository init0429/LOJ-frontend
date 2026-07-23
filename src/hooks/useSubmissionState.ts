import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useSubmissionState(subId: string | null) {
  const [status, setStatus] = useState<string>("코드 작성 중");

  useEffect(() => {
    if (!subId) {
      setStatus("코드 작성 중");
      return;
    }

    setStatus("Pending");
    let isSubscribed = true;

    const pollStatus = async () => {
      if (!isSubscribed) return;
      const { data, error } = await supabase
        .from("submissions")
        .select("status")
        .eq("id", subId)
        .single();
        
      if (error) {
        console.error("상태 조회 에러:", error);
        return;
      }

      if (data) {
        setStatus(data.status);
        if (["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", "System Error"].includes(data.status)) {
          // Terminal status reached, stop polling
          isSubscribed = false;
        }
      }
    };

    const intervalId = setInterval(() => {
      if (isSubscribed) {
        pollStatus();
      }
    }, 1000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [subId]);

  return status;
}

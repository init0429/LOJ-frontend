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
    console.log("Subscribing to realtime updates for:", subId);

    const channel = supabase
      .channel(`submission-updates-${subId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "submissions",
          filter: `id=eq.${subId}`,
        },
        (payload) => {
          console.log("상태 변경 감지: ", payload.new.status);
          setStatus(payload.new.status);

          if (
            ["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error"].includes(
              payload.new.status,
            )
          ) {
            supabase.removeChannel(channel);
          }
        },
      )
      .subscribe((status, err) => {
        console.log("Realtime subscription status:", status);
        if (err) console.error("Realtime error:", err);
      });

    return () => {
      console.log("Unsubscribing from realtime updates for:", subId);
      supabase.removeChannel(channel);
    };
  }, [subId]);

  return status;
}

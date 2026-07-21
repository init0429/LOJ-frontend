import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useSubmissionState(subId: string | null) {
  const [status, setStatus] = useState<string>("코드 작성 중");

  useEffect(() => {
    if (!subId) {
      setStatus("코드 작성 중");
      return;
    }

    setStatus("Pending");

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subId]);

  return status;
}

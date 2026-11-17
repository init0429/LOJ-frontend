"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * 관리 화면용 권한 확인. 로그인하지 않았으면 첫 화면으로 보낸다.
 * 화면을 가리는 용도일 뿐이고, 실제 쓰기 권한은 DB 정책이 막아야 한다.
 */
export function useIsAdmin() {
  const router = useRouter();
  const [state, setState] = useState<{ checking: boolean; isAdmin: boolean }>({
    checking: true,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        router.replace("/");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();
      if (!cancelled) setState({ checking: false, isAdmin: !!profile?.is_admin });
    })();
    return () => { cancelled = true; };
  }, [router]);

  return state;
}

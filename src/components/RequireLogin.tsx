"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/** 로그인해야 보이는 내용. 확인하는 동안과 로그인하지 않았을 때의 안내를 대신 그린다. */
export default function RequireLogin({ children }: { children: (session: Session) => React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return <p role="status" className="notice mt-4 text-sm">불러오는 중…</p>;
  if (session === null) {
    return (
      <div className="mt-4">
        <p className="text-sm text-muted">로그인한 뒤에 쓸 수 있습니다.</p>
        <Link href="/" className="btn btn-fill mt-4">로그인하러 가기</Link>
      </div>
    );
  }
  return <>{children(session)}</>;
}

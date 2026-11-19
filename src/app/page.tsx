"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import GuestLanding from "@/components/home/GuestLanding";
import MemberHome from "@/components/home/MemberHome";
import { supabase } from "@/lib/supabase";

/** 첫 화면. 로그인하지 않았으면 소개 화면, 로그인했으면 내 기록과 할 일을 모은 홈 */
export default function Home() {
  // undefined: 아직 모름. 알기 전에는 어느 쪽도 그리지 않는다(로그인한 사람에게 소개 화면이 잠깐 보이지 않게).
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    // 로그인하거나 로그아웃하면 그 자리에서 화면을 바꾼다.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession((current) => (current?.user.id === next?.user.id && current !== undefined ? current : next));
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return <p role="status" className="notice page">불러오는 중…</p>;
  }
  return session ? <MemberHome key={session.user.id} session={session} /> : <GuestLanding />;
}

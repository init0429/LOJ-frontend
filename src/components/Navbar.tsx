"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Scale, LogOut, User } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/problems", label: "사건 목록" },
  { href: "/contests", label: "심리 일정" },
  { href: "/leaderboard", label: "명부" },
];

export default function Navbar() {
  const [session, setSession] = useState<any>(null);
  const [username, setUsername] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const loadProfile = async (userId: string) => {
      const { data } = await supabase.from("profiles").select("username").eq("id", userId).single();
      setUsername(data?.username ?? null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setUsername(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 문제 풀이 화면에서는 전용 헤더를 사용하므로 기본 Navbar 숨김
  if (pathname?.startsWith("/problems/")) {
    return null;
  }

  return (
    <nav className="h-16 bg-[var(--paper)] border-b border-[var(--rule)] flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Scale className="text-[var(--seal)]" size={22} strokeWidth={2.2} />
          <span className="docket-label text-[15px] tracking-[0.18em] text-[var(--text)]">
            LOJ
          </span>
        </Link>
        <div className="hidden md:flex gap-1 text-sm">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "docket-label text-[11px] px-4 py-2 border-b-2 transition-colors",
                  active
                    ? "border-[var(--seal)] text-[var(--seal)]"
                    : "border-transparent text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--rule-strong)]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        {session ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--text-dim)] bg-[var(--paper-raised)] border border-[var(--rule)] px-3 py-1.5 rounded-sm">
              <User size={14} className="text-[var(--seal)]" />
              <span className="docket-label text-[11px]">{username ?? session.user.email?.split("@")[0]}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[var(--text-dim)] hover:text-[var(--reject)] transition-colors p-2"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link
            href="/"
            className="docket-label text-[11px] border border-[var(--seal)] text-[var(--seal)] hover:bg-[var(--seal)] hover:text-[var(--ink)] px-4 py-2 rounded-sm transition-colors"
          >
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
}
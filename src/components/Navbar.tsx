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
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("username, is_admin")
        .eq("id", userId)
        .single();
      setUsername(data?.username ?? null);
      setIsAdmin(!!data?.is_admin);
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
      else {
        setUsername(null);
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 문제 풀이 화면 / 콘테스트 진행 화면은 전용 헤더(또는 락다운 UI)를 쓰므로 기본 Navbar 숨김
  if (
    pathname?.startsWith("/problems/") ||
    pathname?.startsWith("/contests/")
  ) {
    return null;
  }

  return (
    <nav className="h-16 bg-(--paper) border-b border-(--rule) flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <Link href="/" className="flex items-center gap-2.5">
          <Scale className="text-(--seal)" size={22} strokeWidth={2.2} />
          <span className="docket-label text-[15px] tracking-[0.18em] text-(--text)">
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
                    ? "border-(--seal) text-(--seal)"
                    : "border-transparent text-(--text-dim) hover:text-(--text) hover:border-(--rule-strong)",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin/contests"
              className={clsx(
                "docket-label text-[11px] px-4 py-2 border-b-2 transition-colors",
                pathname.startsWith("/admin")
                  ? "border-(--seal) text-(--seal)"
                  : "border-transparent text-(--text-faint) hover:text-(--text) hover:border-(--rule-strong)",
              )}
            >
              관리
            </Link>
          )}
        </div>
      </div>

      <div>
        {session ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-(--text-dim) bg-(--paper-raised) border border-(--rule) px-3 py-1.5 rounded-sm">
              <User size={14} className="text-(--seal)" />
              <span className="docket-label text-[11px]">
                {username ?? session.user.email?.split("@")[0]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-(--text-dim) hover:text-(--reject) transition-colors p-2"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <Link
            href="/"
            className="docket-label text-[11px] border border-(--seal) text-(--seal) hover:bg-(--seal) hover:text-(--ink) px-4 py-2 rounded-sm transition-colors"
          >
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
}

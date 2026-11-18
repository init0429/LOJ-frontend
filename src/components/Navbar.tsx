"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { PROFILE_EVENT } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/problems", label: "문제" },
  { href: "/recommend", label: "추천" },
  { href: "/contests", label: "대회" },
  { href: "/leaderboard", label: "순위" },
];

export default function Navbar() {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    let currentUserId: string | undefined;
    const loadProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("username, is_admin")
        .eq("id", userId)
        .single();
      if (!active || currentUserId !== userId) return;
      setUsername(data?.username ?? null);
      setIsAdmin(!!data?.is_admin);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      currentUserId = session?.user.id;
      setSession(session);
      setUsername(null);
      setIsAdmin(false);
      if (session) {
        const userId = session.user.id;
        setTimeout(() => {
          if (active && currentUserId === userId) void loadProfile(userId);
        }, 0);
      }
    });

    // 설정 화면에서 이름을 바꾸면 다시 읽는다.
    const onProfileChange = () => {
      if (currentUserId) void loadProfile(currentUserId);
    };
    window.addEventListener(PROFILE_EVENT, onProfileChange);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_EVENT, onProfileChange);
    };
  }, []);

  // 문제 풀이 화면과 대회 진행 화면은 자체 머리줄을 쓴다.
  if (pathname?.startsWith("/problems/") || pathname?.startsWith("/contests/")) {
    return null;
  }

  const items = isAdmin ? [...NAV_ITEMS, { href: "/admin/contests", label: "관리" }] : NAV_ITEMS;
  const isCurrent = (href: string) =>
    href.startsWith("/admin") ? pathname.startsWith("/admin") : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-x-6 px-5">
        <Link href={session ? "/problems" : "/"} className="py-2.5 text-lg">
          <Logo />
        </Link>
        <nav aria-label="주요 메뉴" className="order-last -mx-2.5 flex w-full flex-wrap items-center sm:order-none sm:mx-0 sm:w-auto">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="tab"
              aria-current={isCurrent(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {session ? (
            <>
              <Link
                href="/settings"
                title="설정"
                aria-current={pathname.startsWith("/settings") ? "page" : undefined}
                className="max-w-40 truncate text-sm hover:underline"
              >
                {username ?? session.user.email?.split("@")[0]}
              </Link>
              <button type="button" onClick={() => void supabase.auth.signOut()} className="btn btn-sm btn-line">
                로그아웃
              </button>
            </>
          ) : (
            pathname !== "/" && (
              <Link href="/" className="btn btn-sm btn-fill">
                로그인
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}

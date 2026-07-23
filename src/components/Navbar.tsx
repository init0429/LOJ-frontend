"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Code2, LogOut, User } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function Navbar() {
  const [session, setSession] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
    <nav className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          <Code2 className="text-emerald-400" size={24} />
          LOJ Platform
        </Link>
        <div className="hidden md:flex gap-1 text-sm font-medium">
          <Link 
            href="/problems" 
            className={clsx(
              "px-4 py-2 rounded-lg transition-colors",
              pathname.startsWith("/problems") ? "text-emerald-400 bg-slate-800" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            )}
          >
            문제 목록
          </Link>
          <Link 
            href="/contests" 
            className={clsx(
              "px-4 py-2 rounded-lg transition-colors",
              pathname.startsWith("/contests") ? "text-emerald-400 bg-slate-800" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            )}
          >
            콘테스트
          </Link>
          <Link 
            href="/leaderboard" 
            className={clsx(
              "px-4 py-2 rounded-lg transition-colors",
              pathname.startsWith("/leaderboard") ? "text-emerald-400 bg-slate-800" : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
            )}
          >
            리더보드
          </Link>
        </div>
      </div>
      
      <div>
        {session ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800 px-3 py-1.5 rounded-full">
              <User size={16} className="text-emerald-400" />
              <span>{session.user.email?.split("@")[0]}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 transition-colors p-2"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <Link href="/" className="text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors">
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
}

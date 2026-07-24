"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogIn, ArrowRight, Scale } from "lucide-react";
import { motion } from "framer-motion";
import StampTag from "@/components/StampTag";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // 로그인 상태면 즉시 문제 목록으로 리다이렉트
      if (session) router.replace("/problems");
      else setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/problems");
      else setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setError("가입 성공! 이메일을 확인해 주세요. (이메일 인증을 끈 경우엔 바로 로그인 가능합니다)");
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const docket = [
    { no: "01", label: "샌드박스 채점", desc: "Docker 컨테이너 안에서만 코드가 실행됩니다" },
    { no: "02", label: "즉시 판결", desc: "제출과 동시에 큐에 등록되어 순서대로 심사됩니다" },
    { no: "03", label: "정식 기록", desc: "모든 제출 이력이 사건철에 남습니다" },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--paper)] flex-col justify-center p-16 border-r border-[var(--rule)]">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md"
        >
          <div className="flex items-center gap-3 mb-10">
            <Scale className="text-[var(--seal)]" size={30} strokeWidth={2} />
            <div>
              <h1 className="docket-label text-2xl tracking-[0.2em] text-[var(--text)]">LOJ</h1>
              <p className="text-[var(--text-dim)] text-xs docket-label tracking-[0.16em] mt-0.5">
                Local Online Judge — 사건기록부
              </p>
            </div>
          </div>

          <p className="text-[var(--text)] text-lg leading-relaxed mb-12 border-l-2 border-[var(--seal)] pl-5">
            제출한 코드는 격리된 법정에서 심사를 거쳐,<br />
            <span className="text-[var(--seal)]">도장 찍힌 판결</span>로 돌아옵니다.
          </p>

          <div className="space-y-0 border-t border-[var(--rule)]">
            {docket.map((d, i) => (
              <motion.div
                key={d.no}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex items-start gap-4 py-4 border-b border-[var(--rule)]"
              >
                <span className="docket-label text-[var(--text-faint)] text-sm shrink-0 pt-0.5">{d.no}</span>
                <div>
                  <div className="docket-label text-[13px] text-[var(--text)]">{d.label}</div>
                  <div className="text-[var(--text-dim)] text-sm mt-1">{d.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-[var(--ink)]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <Scale className="text-[var(--seal)]" size={24} />
            <span className="docket-label text-lg tracking-[0.2em]">LOJ</span>
          </div>

          <div className="docket-label text-[11px] text-[var(--text-faint)] mb-2">
            {mode === "login" ? "로그인" : "회원가입"}
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text)] mb-1">
            {mode === "login" ? "다시 오셨군요" : "계정 만들기"}
          </h2>
          <p className="text-[var(--text-dim)] text-sm mb-8">
            {mode === "login"
              ? "이메일과 비밀번호로 로그인하세요"
              : "이메일로 간단하게 가입할 수 있어요"}
          </p>

          <form onSubmit={mode === "login" ? handleLogin : handleSignUp} className="flex flex-col gap-4">
            <div>
              <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)] placeholder-[var(--text-faint)] transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="docket-label block text-[11px] text-[var(--text-dim)] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-[var(--paper)] border border-[var(--rule)] rounded-sm focus:outline-none focus:border-[var(--seal)] text-[var(--text)] placeholder-[var(--text-faint)] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2">
                <StampTag
                  label={error.includes("성공") ? "확인" : "반려"}
                  tone={error.includes("성공") ? "accept" : "reject"}
                  size="sm"
                  tilt={false}
                />
                <p className={`text-sm ${error.includes("성공") ? "text-[var(--accept)]" : "text-[var(--reject)]"}`}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--seal)] hover:bg-[var(--seal-dim)] text-[var(--ink)] rounded-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-[var(--ink)]/30 border-t-[var(--ink)] animate-spin" />
              ) : (
                <>
                  {mode === "login" ? <LogIn size={18} /> : <ArrowRight size={18} />}
                  {mode === "login" ? "로그인" : "회원가입"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              className="text-sm text-[var(--text-dim)] hover:text-[var(--seal)] transition-colors"
            >
              {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
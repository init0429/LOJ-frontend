"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { LogIn, ArrowRight, Code2, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";

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

  const features = [
    { icon: <Zap size={20} />, label: "빠른 채점", desc: "Docker 샌드박스 기반 실시간 채점" },
    { icon: <Shield size={20} />, label: "안전한 환경", desc: "격리된 컨테이너로 코드 보안 보장" },
    { icon: <Code2 size={20} />, label: "Monaco 에디터", desc: "VS Code 수준의 코딩 경험" },
  ];

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-md"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Code2 className="text-emerald-400" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                LOJ Platform
              </h1>
              <p className="text-slate-500 text-sm">Lightweight Online Judge</p>
            </div>
          </div>
          
          <p className="text-slate-300 text-xl leading-relaxed mb-12">
            직접 만든 온라인 저지 플랫폼으로<br />
            <span className="text-emerald-400 font-semibold">알고리즘 실력</span>을 키워보세요.
          </p>

          <div className="space-y-4">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-colors"
              >
                <div className="text-emerald-400 mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <div className="font-semibold text-slate-200 text-sm">{f.label}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <Code2 className="text-emerald-400" size={28} />
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              LOJ Platform
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-100 mb-1">
            {mode === "login" ? "다시 오셨군요!" : "계정 만들기"}
          </h2>
          <p className="text-slate-500 text-sm mb-8">
            {mode === "login"
              ? "이메일과 비밀번호로 로그인하세요"
              : "이메일로 간단하게 가입할 수 있어요"}
          </p>

          <form onSubmit={mode === "login" ? handleLogin : handleSignUp} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-200 placeholder-slate-600 transition-all"
                placeholder="developer@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 text-slate-200 placeholder-slate-600 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className={`text-sm mt-1 ${error.includes("성공") ? "text-emerald-400" : "text-red-400"}`}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
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
              className="text-sm text-slate-500 hover:text-emerald-400 transition-colors"
            >
              {mode === "login" ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

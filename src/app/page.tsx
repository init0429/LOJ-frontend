"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { motion } from "framer-motion";
import StampTag from "@/components/StampTag";

const SCHOOL_DOMAIN = "bssm.hs.kr";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/problems");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/problems");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        // hd(hosted domain)는 구글 계정 선택 화면에서 bssm.hs.kr 계정만
        // 보여주는 UI 힌트일 뿐, 진짜 검증은 DB 트리거(handle_new_user)에서 함.
        queryParams: { hd: SCHOOL_DOMAIN },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // 성공 시 구글 로그인 페이지로 리다이렉트되므로 별도 처리 없음
  };

  const docket = [
    {
      no: "01",
      label: "샌드박스 채점",
      desc: "Docker 컨테이너 안에서만 코드가 실행됩니다",
    },
    {
      no: "02",
      label: "즉시 판결",
      desc: "제출과 동시에 큐에 등록되어 순서대로 심사됩니다",
    },
    {
      no: "03",
      label: "정식 기록",
      desc: "모든 제출 이력이 사건철에 남습니다",
    },
  ];

  const newLocal = "text-[var(--seal)]";
  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-(--paper) flex-col justify-center p-16 border-r border-(--rule)">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md"
        >
          <div className="flex items-center gap-3 mb-10">
            <Scale className={newLocal} size={30} strokeWidth={2} />
            <div>
              <h1 className="docket-label text-2xl tracking-[0.2em] text-(--text)">
                LOJ
              </h1>
              <p className="text-(--text-dim) text-xs docket-label tracking-[0.16em] mt-0.5">
                Lize Online Judge — 사건기록부
              </p>
            </div>
          </div>

          <p className="text-(--text) text-lg leading-relaxed mb-12 border-l-2 border-(--seal) pl-5">
            제출한 코드는 격리된 법정에서 심사를 거쳐,
            <br />
            <span className="text-(--seal)">도장 찍힌 판결</span>로
            돌아옵니다.
          </p>

          <div className="space-y-0 border-t border-(--rule)">
            {docket.map((d, i) => (
              <motion.div
                key={d.no}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex items-start gap-4 py-4 border-b border-(--rule)"
              >
                <span className="docket-label text-(--text-faint) text-sm shrink-0 pt-0.5">
                  {d.no}
                </span>
                <div>
                  <div className="docket-label text-[13px] text-(--text)">
                    {d.label}
                  </div>
                  <div className="text-(--text-dim) text-sm mt-1">
                    {d.desc}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right: Auth */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-(--ink)">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <Scale className="text-(--seal)" size={24} />
            <span className="docket-label text-lg tracking-[0.2em]">LOJ</span>
          </div>

          <div className="docket-label text-[11px] text-(--text-faint) mb-2 text-center">
            본인 확인
          </div>
          <h2 className="text-2xl font-semibold text-(--text) mb-1 text-center">
            출석하기
          </h2>
          <p className="text-(--text-dim) text-sm mb-8 text-center">
            학교 계정({SCHOOL_DOMAIN})으로만 출입할 수 있습니다
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-(--paper) hover:bg-(--paper-raised) border border-(--rule) hover:border-(--rule-strong) rounded-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-(--text)"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-(--text-faint)/30 border-t-(--text) animate-spin" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path
                    fill="#FFC107"
                    d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.3 14.7l6.6 4.8C14.6 15.9 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3c-7.5 0-13.9 4.3-17.7 10.7z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.9 40.5 16.4 45 24 45z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.5 5.5c-.5.4 7.2-5.3 7.2-15.6 0-1.4-.1-2.7-.4-3.5z"
                  />
                </svg>
                Google 계정으로 계속하기
              </>
            )}
          </button>

          {error && (
            <div className="flex items-center gap-2 mt-4 justify-center">
              <StampTag label="반려" tone="reject" size="sm" tilt={false} />
              <p className="text-sm text-(--reject)">{error}</p>
            </div>
          )}

          <p className="text-(--text-faint) text-xs text-center mt-8">
            @{SCHOOL_DOMAIN} 계정이 아니면 가입이 자동으로 거부됩니다
          </p>
        </motion.div>
      </div>
    </div>
  );
}

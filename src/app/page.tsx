"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { errorMessage } from "@/lib/errors";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/problems");
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { hd: "bssm.hs.kr" },
        },
      });
      if (error) throw error;
    } catch (error) {
      setError(errorMessage(error, "로그인 연결에 실패했습니다. 잠시 후 다시 시도하세요."));
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <section aria-labelledby="intro-title" className="min-w-0">
        <h1 id="intro-title" className="landing-title">생각을 코드로.<br />풀이는 기록으로.</h1>
        <p className="mt-6 max-w-lg text-base text-(--text-dim) leading-relaxed">
          문제를 풀고, 테스트하고, 다시 도전하세요.<br />LOJ가 여러분의 풀이와 채점 결과를 기록합니다.
        </p>
        <div className="code-record" aria-label="두 수의 합 문제 풀이와 채점 결과 예시">
          <div className="flex flex-wrap justify-between gap-2 px-6 py-3 border-b border-(--rule) text-sm text-(--text-dim)">
            <span>연습 문제: 두 수의 합</span><span>Python 3</span>
          </div>
          <pre><code>{"a, b = map(int, input().split())\n\nprint(a + b)"}</code></pre>
          <div className="flex flex-wrap justify-between gap-3 px-6 py-4 border-t border-(--rule) text-sm">
            <span className="flex items-center gap-2 text-(--accept)"><Check size={17} aria-hidden="true" />정답입니다</span>
            <span className="text-(--text-faint)">채점 결과 예시</span>
          </div>
        </div>
        <p className="mt-5 text-sm text-(--text-faint)">Python, C, C++, Java, SQL을 지원합니다.</p>
      </section>

      <section className="w-full max-w-md py-6" aria-labelledby="login-title">
        <h2 id="login-title" className="text-2xl font-semibold tracking-tight">오늘의 풀이를 시작하세요</h2>
        <p className="mt-3 text-sm text-(--text-dim) leading-7">학교 Google 계정으로 로그인하면<br />문제를 풀고 대회에 참가할 수 있습니다.</p>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-8 w-full min-h-13 flex items-center justify-center gap-3 px-5 py-3 rounded-lg bg-(--seal) text-(--ink) font-semibold hover:bg-(--seal-dim) disabled:opacity-60"
        >
          {loading && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
          {loading ? "Google 로그인 연결 중" : "학교 Google 계정으로 로그인"}
        </button>
        {error && <p role="alert" className="mt-4 text-sm text-(--reject)">{error}</p>}
        <p className="mt-4 text-sm text-(--text-faint)">@bssm.hs.kr 계정만 사용할 수 있습니다.</p>
        <div className="mt-10 pt-6 border-t border-(--rule) text-sm text-(--text-dim) leading-7">
          <p className="font-semibold text-(--text)">풀이 기록은 그대로 남습니다</p>
          <p className="mt-1">제출한 코드의 채점 결과를 확인하고,<br />콘테스트에서는 작성 중인 코드를 자동 저장합니다.</p>
        </div>
      </section>
    </div>
  );
}

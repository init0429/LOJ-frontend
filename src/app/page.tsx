"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import { SUM_SAMPLES } from "@/lib/samples";
import Difficulty from "@/components/Difficulty";
import GradeMark from "@/components/GradeMark";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState(SUM_SAMPLES[0].id);
  const router = useRouter();
  const sample = SUM_SAMPLES.find((item) => item.id === sampleId) ?? SUM_SAMPLES[0];

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
      setError(errorMessage(error, "Google 로그인에 연결하지 못했습니다. 잠시 후 다시 눌러 주세요."));
      setLoading(false);
    }
  };

  return (
    <div className="page grid flex-1 items-center gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      <section aria-labelledby="intro-title" className="min-w-0">
        <h1 id="intro-title" className="text-[clamp(46px,7.4vw,92px)] font-black leading-[1.1] tracking-[-0.035em]">
          제출하면
          <br />
          바로 채점.
        </h1>
        <p className="mt-7 max-w-[30em] text-[17px] text-pencil">
          문제를 풀어 코드를 내면 숨겨진 테스트까지 돌려 보고 결과를 알려 줍니다.
          제출 전에는 예제로 먼저 실행해 볼 수 있고, 대회 중에는 쓰던 코드가 자동으로 저장됩니다.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button onClick={handleGoogleLogin} disabled={loading} className="btn btn-fill min-h-13 px-7 text-base">
            {loading && <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />}
            {loading ? "Google로 이동하는 중" : "학교 Google 계정으로 로그인"}
          </button>
          <Link href="/problems" className="text-link">
            문제 먼저 둘러보기
          </Link>
        </div>
        {error && <p role="alert" className="notice-error mt-4 text-sm">{error}</p>}
        <p className="notice mt-4 text-sm">@bssm.hs.kr 계정만 쓸 수 있습니다.</p>
      </section>

      <section aria-label="두 수의 합 풀이를 채점한 예시" className="sheet min-w-0 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="relative inline-flex h-14 w-14 flex-none items-center justify-center text-[28px] font-black">
            1
            <GradeMark key={sample.id} kind="correct" draw className="absolute -inset-1.5" />
          </span>
          <h2 className="whitespace-nowrap text-[22px] font-extrabold leading-snug">두 수의 합</h2>
          <span className="ml-auto pr-3">
            <Difficulty value={1} showLabel />
          </span>
        </div>
        <p className="mt-4">두 정수 A와 B를 입력받아 A+B를 출력하세요.</p>

        <div role="group" aria-label="예시 풀이 언어" className="mt-6 -mx-2 flex flex-wrap gap-x-0.5 border-t border-line pt-4">
          {SUM_SAMPLES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="choice choice-sm"
              aria-pressed={item.id === sample.id}
              onClick={() => setSampleId(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="relative mt-3">
          <pre className="code-box h-[232px] overflow-auto whitespace-pre"><code>{sample.code}</code></pre>
          <p key={sample.id} className="hand landing-verdict pointer-events-none absolute right-5 bottom-3 -rotate-6 text-[68px]">
            정답
          </p>
        </div>
        <p className="notice mt-4 text-sm">예제 입력 1 2를 넣으면 3이 나옵니다.</p>
      </section>
    </div>
  );
}

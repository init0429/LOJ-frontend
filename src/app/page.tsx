"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import { LANGUAGE_LABELS } from "@/lib/languages";

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
      setError(errorMessage(error, "Google 로그인에 연결하지 못했습니다. 다시 시도해 주세요."));
      setLoading(false);
    }
  };

  return (
    <div className="page page-narrow">
      <h1 className="page-title">LOJ</h1>
      <p className="mt-2">
        학교에서 쓰는 온라인 저지입니다. 문제를 풀어 제출하면 숨겨진 테스트로 채점합니다.
      </p>

      <div className="box mt-6 p-5">
        <button onClick={handleGoogleLogin} disabled={loading} className="btn btn-fill">
          {loading && <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />}
          학교 Google 계정으로 로그인
        </button>
        {error && <p role="alert" className="notice-error mt-3 text-sm">{error}</p>}
        <p className="notice mt-3 text-sm">@bssm.hs.kr 계정만 쓸 수 있습니다.</p>
      </div>

      <p className="mt-6 text-sm">
        <Link href="/problems" className="text-link">로그인하지 않고 문제 보기</Link>
      </p>

      <h2 className="section-title mt-10">지원 언어</h2>
      <p className="mt-1 text-sm text-muted">{Object.values(LANGUAGE_LABELS).join(", ")}</p>
    </div>
  );
}

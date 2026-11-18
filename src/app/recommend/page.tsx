"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import RecommendationView from "@/components/RecommendationView";
import { errorMessage } from "@/lib/errors";
import { getRecommendations, type Recommendations } from "@/lib/recommend-api";
import { supabase } from "@/lib/supabase";

export default function RecommendPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">추천 문제</h1>
      {session === undefined ? (
        <p role="status" className="notice mt-4">불러오는 중…</p>
      ) : session === null ? (
        <>
          <p className="page-lead">로그인하면 내 수준에 맞는 문제를 골라 드립니다.</p>
          <Link href="/" className="btn btn-fill mt-6">로그인하러 가기</Link>
        </>
      ) : (
        <RecommendationList key={session.user.id} />
      )}
    </div>
  );
}

function RecommendationList() {
  const [result, setResult] = useState<Recommendations | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    setRefreshing(true);
    getRecommendations(true).then(
      (next) => {
        setResult(next);
        setRefreshing(false);
      },
      (err) => {
        setError(errorMessage(err, "추천을 다시 받지 못했습니다."));
        setRefreshing(false);
      },
    );
  };

  useEffect(() => {
    let active = true;
    getRecommendations().then(
      (next) => {
        if (!active) return;
        setResult(next);
        setError(null);
      },
      (err) => {
        if (active) setError(errorMessage(err, "추천을 불러오지 못했습니다."));
      },
    );
    return () => {
      active = false;
    };
  }, [reloads]);

  if (error) {
    return (
      <div className="mt-4">
        <p role="alert" className="notice-error">{error}</p>
        <button type="button" onClick={() => { setError(null); setReloads((n) => n + 1); }} className="btn btn-sm btn-line mt-3">
          다시 불러오기
        </button>
      </div>
    );
  }
  if (!result) {
    return <p role="status" className="notice mt-4">내 기록을 살펴보는 중…</p>;
  }

  return <RecommendationView result={result} onRefresh={refresh} refreshing={refreshing} />;
}

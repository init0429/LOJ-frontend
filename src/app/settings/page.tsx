"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import { LINK_RESULTS, getSolvedacStatus, startSolvedacLink, unlinkSolvedac, type SolvedacStatus } from "@/lib/solvedac-api";
import { tierName } from "@/lib/solvedac-tier";

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <p role="status" className="notice page page-narrow">불러오는 중…</p>;
  }
  if (session === null) {
    return (
      <div className="page page-narrow">
        <h1 className="page-title">설정</h1>
        <p className="page-lead">로그인한 뒤에 쓸 수 있습니다.</p>
        <Link href="/" className="btn btn-fill mt-8">로그인하러 가기</Link>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <h1 className="page-title">설정</h1>
      <p className="page-lead">{session.user.email}</p>
      <Suspense>
        <SolvedacSection />
      </Suspense>
    </div>
  );
}

function SolvedacSection() {
  const [status, setStatus] = useState<SolvedacStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // 늘리면 연동 상태를 다시 불러온다.
  const [reloads, setReloads] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  // solved.ac에서 돌아오면 ?solvedac=결과 가 붙어 있다. 다른 동작을 하기 전까지 그 안내를 보여 준다.
  const returned = useSearchParams().get("solvedac");
  const result = actionResult ?? (returned ? LINK_RESULTS[returned] ?? LINK_RESULTS.failed : null);
  const setResult = (next: { ok: boolean; message: string } | null) => {
    setActionResult(next);
    if (returned) router.replace(pathname, { scroll: false });
  };
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let active = true;
    getSolvedacStatus().then(
      (next) => {
        if (!active) return;
        setStatus(next);
        setLoadError(null);
      },
      (error) => {
        if (active) setLoadError(errorMessage(error, "연동 상태를 불러오지 못했습니다."));
      },
    );
    return () => {
      active = false;
    };
  }, [reloads]);

  const connect = async () => {
    setBusy(true);
    setResult(null);
    try {
      window.location.assign(await startSolvedacLink());
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error, "solved.ac 연결을 시작하지 못했습니다.") });
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setResult(null);
    try {
      await unlinkSolvedac();
      setResult({ ok: true, message: "solved.ac 연결을 해제했습니다." });
      setConfirming(false);
      setReloads((count) => count + 1);
    } catch (error) {
      setResult({ ok: false, message: errorMessage(error, "연결을 해제하지 못했습니다.") });
    } finally {
      setBusy(false);
    }
  };

  const spinner = busy && <LoaderCircle className="animate-spin" size={16} aria-hidden="true" />;

  return (
    <section aria-labelledby="solvedac-title" className="mt-10">
      <h2 id="solvedac-title" className="section-title">solved.ac 연동</h2>
      <p className="mt-1 text-sm text-muted">
        solved.ac 계정을 연결하면 티어와 태그별로 푼 문제를 바탕으로 수준에 맞는 문제를 추천받을 수 있습니다.
      </p>

      {result && (
        <p role={result.ok ? "status" : "alert"} className={`mt-4 text-sm ${result.ok ? "" : "notice-error"}`}>
          {result.message}
        </p>
      )}

      <div className="box mt-4 p-5">
        {loadError ? (
          <div>
            <p role="alert" className="notice-error text-sm">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setLoadError(null);
                setReloads((count) => count + 1);
              }}
              className="btn btn-sm btn-line mt-3"
            >
              다시 불러오기
            </button>
          </div>
        ) : status === null ? (
          <p role="status" className="notice text-sm">연동 상태를 불러오는 중…</p>
        ) : !status.configured ? (
          <p className="notice text-sm">solved.ac 연동은 아직 준비 중입니다.</p>
        ) : !status.linked ? (
          <div>
            <p className="text-sm">연결된 solved.ac 계정이 없습니다.</p>
            <button type="button" onClick={() => void connect()} disabled={busy} className="btn btn-fill mt-4">
              {spinner}
              solved.ac 연결
            </button>
          </div>
        ) : (
          <div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted">계정</dt>
              <dd>
                <a
                  href={`https://solved.ac/profile/${encodeURIComponent(status.handle ?? "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link font-semibold"
                >
                  {status.handle}
                </a>
              </dd>
              <dt className="text-muted">티어</dt>
              <dd>{status.tier == null ? "—" : tierName(status.tier)}</dd>
              <dt className="text-muted">레이팅</dt>
              <dd className="tabular-nums">{status.rating ?? "—"}</dd>
              <dt className="text-muted">푼 문제</dt>
              <dd className="tabular-nums">{status.solved_count ?? "—"}</dd>
            </dl>

            {status.status === "expired" && (
              <p role="alert" className="notice-error mt-4 text-sm">
                연결이 끊어졌습니다. solved.ac에서 연결을 해제했거나 오래 쓰지 않아 만료되었습니다. 다시 연결해 주세요.
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {status.status === "expired" && (
                <button type="button" onClick={() => void connect()} disabled={busy} className="btn btn-fill">
                  {spinner}
                  다시 연결
                </button>
              )}
              {confirming ? (
                <>
                  <span className="text-sm">연결을 해제할까요?</span>
                  <button type="button" onClick={() => void disconnect()} disabled={busy} className="btn btn-sm btn-line">
                    {spinner}
                    해제
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="btn btn-sm btn-line">
                    취소
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} disabled={busy} className="btn btn-sm btn-line">
                  연결 해제
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import RequireLogin from "@/components/RequireLogin";
import { SettingsHeading } from "@/components/SettingsShell";
import { formatDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";

export default function AccountSettings() {
  return (
    <>
      <Suspense>
        <ForwardSolvedacResult />
      </Suspense>
      <SettingsHeading title="정보" lead="LOJ는 Google 계정으로 로그인합니다." />
      <RequireLogin>{(session) => <AccountInfo session={session} />}</RequireLogin>
    </>
  );
}

/** solved.ac 연결을 마치면 /settings?solvedac=결과 로 돌아온다. 그 안내는 solved.ac 항목에서 보여 준다. */
function ForwardSolvedacResult() {
  const result = useSearchParams().get("solvedac");
  const router = useRouter();
  useEffect(() => {
    if (result) router.replace(`/settings/solvedac?solvedac=${encodeURIComponent(result)}`);
  }, [result, router]);
  return null;
}

function AccountInfo({ session }: { session: Session }) {
  const [profile, setProfile] = useState<{ username: string | null; is_admin: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    void supabase
      .from("profiles")
      .select("username, is_admin")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setProfile({ username: data?.username ?? null, is_admin: !!data?.is_admin });
      });
    return () => {
      active = false;
    };
  }, [session.user.id]);

  return (
    <dl className="mt-2 text-sm">
      <Row label="이메일">{session.user.email ?? "—"}</Row>
      <Row label="이름" hint="순위표와 대회 순위에 이 이름이 보입니다.">
        {profile ? profile.username || "—" : <span className="text-muted">불러오는 중…</span>}
      </Row>
      {profile?.is_admin && <Row label="권한">관리자</Row>}
      <Row label="가입한 때">{formatDateTime(session.user.created_at)}</Row>
    </dl>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-4 sm:flex-row sm:gap-6">
      <dt className="font-medium sm:w-32 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 break-words">
        {children}
        {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      </dd>
    </div>
  );
}

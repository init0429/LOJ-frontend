"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import RequireLogin from "@/components/RequireLogin";
import { SettingsHeading } from "@/components/SettingsShell";
import { formatDateTime } from "@/lib/format";
import { PROFILE_EVENT, USERNAME_MAX, normalizeUsername } from "@/lib/profile";
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
        {profile ? (
          <NameField
            userId={session.user.id}
            name={profile.username}
            onSaved={(username) => setProfile({ ...profile, username })}
          />
        ) : (
          <span className="text-muted">불러오는 중…</span>
        )}
      </Row>
      {profile?.is_admin && <Row label="권한">관리자</Row>}
      <Row label="가입한 때">{formatDateTime(session.user.created_at)}</Row>
    </dl>
  );
}

function NameField({
  userId,
  name,
  onSaved,
}: {
  userId: string;
  name: string | null;
  onSaved: (name: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (draft === null) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span>{name || "—"}</span>
        <button
          type="button"
          onClick={() => {
            setDraft(name ?? "");
            setMessage(null);
          }}
          className="btn btn-sm btn-line"
        >
          이름 바꾸기
        </button>
        {message && <span role="status" className="text-[13px] text-ok">{message.text}</span>}
      </div>
    );
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const checked = normalizeUsername(draft);
    if ("error" in checked) return setMessage({ ok: false, text: checked.error });
    if (checked.name === name) return setDraft(null);
    setSaving(true);
    setMessage(null);
    const { data, error } = await supabase
      .from("profiles")
      .update({ username: checked.name })
      .eq("id", userId)
      .select("username")
      .maybeSingle();
    setSaving(false);
    // 권한이 없으면(SQL 실행 전) 오류 없이 0행이 돌아올 수도 있다.
    if (error || !data) return setMessage({ ok: false, text: "이름을 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요." });
    onSaved(data.username);
    setDraft(null);
    setMessage({ ok: true, text: "바꿨습니다." });
    window.dispatchEvent(new Event(PROFILE_EVENT));
  };

  return (
    <form onSubmit={(event) => void save(event)} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="username" className="sr-only">새 이름</label>
        <input
          id="username"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={USERNAME_MAX + 10}
          autoComplete="nickname"
          autoFocus
          aria-invalid={message && !message.ok ? true : undefined}
          aria-describedby="username-rule"
          className="input w-56"
        />
        <button type="submit" disabled={saving} className="btn btn-sm btn-fill">
          {saving ? "저장하는 중" : "저장"}
        </button>
        <button type="button" onClick={() => setDraft(null)} disabled={saving} className="btn btn-sm btn-line">
          취소
        </button>
      </div>
      <p id="username-rule" className="text-[13px] text-muted">{USERNAME_MAX}자까지, 앞뒤 공백은 지웁니다.</p>
      {message && !message.ok && <p role="alert" className="notice-error text-[13px]">{message.text}</p>}
    </form>
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

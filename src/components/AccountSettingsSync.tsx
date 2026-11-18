"use client";

import { useEffect } from "react";
import { setThemeMode } from "@/hooks/useTheme";
import { parseAccountSettings, readLocalSettings, sameSettings, writeLocalSettings, type AccountSettings } from "@/lib/account-settings";
import { LANGUAGE_EVENT } from "@/lib/drafts";
import { PREFERENCES_EVENT } from "@/lib/preferences";
import { supabase } from "@/lib/supabase";
import { THEME_MODE_EVENT } from "@/lib/theme";

// 설정을 바꾸고 나서 이만큼 조용하면 계정에 올린다(글자 크기를 연달아 바꿀 때 한 번만 보내려고).
const PUSH_DELAY_MS = 800;

/**
 * 로그인한 사용자의 설정을 계정과 맞춘다. 화면에는 아무것도 그리지 않는다.
 * - 로그인하면 계정에 저장된 설정을 이 브라우저에 쓴다. 계정에 아직 없으면 이 브라우저의 설정을 올린다.
 * - 이 브라우저에서 설정을 바꾸면 계정에도 올린다.
 * 계정 설정 표가 없거나(SQL 실행 전) 요청이 실패하면 조용히 이 브라우저 설정만 쓴다.
 */
export default function AccountSettingsSync() {
  useEffect(() => {
    let active = true;
    let userId: string | null = null;
    // 계정에 있다고 알고 있는 설정. 같으면 다시 올리지 않는다.
    let synced: AccountSettings | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const push = () => {
      const id = userId;
      if (!id) return;
      const local = readLocalSettings();
      if (synced && sameSettings(local, synced)) return;
      void supabase
        .from("user_settings")
        .upsert({ user_id: id, settings: local, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (!error && userId === id) synced = local;
        });
    };

    const schedule = () => {
      if (!userId) return;
      clearTimeout(timer);
      timer = setTimeout(push, PUSH_DELAY_MS);
    };

    const pull = async (id: string) => {
      const { data, error } = await supabase.from("user_settings").select("settings").eq("user_id", id).maybeSingle();
      if (!active || userId !== id || error) return;
      if (!data) return push();
      const remote = parseAccountSettings(data.settings);
      synced = remote;
      if (sameSettings(remote, readLocalSettings())) return;
      // 아래에서 나가는 변경 알림으로 다시 올리지 않도록 synced를 먼저 맞춰 두었다.
      writeLocalSettings(remote);
      setThemeMode(remote.theme);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (id === userId) return;
      userId = id;
      synced = null;
      clearTimeout(timer);
      // 인증 이벤트 안에서 바로 Supabase를 부르면 막힐 수 있어 한 박자 미룬다.
      if (id) setTimeout(() => void pull(id), 0);
    });

    for (const name of [PREFERENCES_EVENT, LANGUAGE_EVENT, THEME_MODE_EVENT]) window.addEventListener(name, schedule);
    return () => {
      active = false;
      clearTimeout(timer);
      subscription.unsubscribe();
      for (const name of [PREFERENCES_EVENT, LANGUAGE_EVENT, THEME_MODE_EVENT]) window.removeEventListener(name, schedule);
    };
  }, []);

  return null;
}

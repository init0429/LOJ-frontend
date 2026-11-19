"use client";

import ProblemLevel from "@/components/ProblemLevel";
import { SAVE_NOTE, SettingRow, SettingsHeading, Switch } from "@/components/SettingsShell";
import { usePreferences } from "@/hooks/usePreferences";
import { useThemeMode } from "@/hooks/useTheme";
import { THEME_OPTIONS, isThemeMode } from "@/lib/theme";

export default function ViewSettings() {
  const [preferences, update] = usePreferences();
  const [themeMode, setThemeMode] = useThemeMode();

  return (
    <>
      <SettingsHeading title="보기" lead={SAVE_NOTE} />

      <SettingRow
        label="테마"
        htmlFor="view-theme"
        hint="시스템 설정에 맞춤은 운영체제 밝기에 따라 기본 라이트·다크를 씁니다. Interrupt는 네온 분홍 강조색의 테마입니다. 화면 위쪽의 해·달 단추는 고른 테마 안에서 밝기만 바꿉니다."
      >
        <select
          id="view-theme"
          value={themeMode}
          onChange={(event) => {
            if (isThemeMode(event.target.value)) setThemeMode(event.target.value);
          }}
          className="input w-48"
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </SettingRow>

      <SettingRow
        label="solved.ac 티어로 난이도 보기"
        htmlFor="view-tier"
        hint={
          <>
            끄면 LOJ 난이도로 보입니다. 지금 보이는 모양:{" "}
            <span className="ml-1 inline-flex align-middle"><ProblemLevel tier={6} difficulty={2} /></span>
          </>
        }
      >
        <Switch id="view-tier" checked={preferences.showTier} onChange={(next) => update({ showTier: next })} />
      </SettingRow>

      <SettingRow
        label="알고리즘 분류 항상 보기"
        htmlFor="view-tags"
        hint="끄면 문제와 추천 화면에서 ‘태그 보기’를 눌러야 보입니다. 대회 중인 문제에는 이 설정과 관계없이 나오지 않습니다."
      >
        <Switch id="view-tags" checked={preferences.showTags} onChange={(next) => update({ showTags: next })} />
      </SettingRow>
    </>
  );
}

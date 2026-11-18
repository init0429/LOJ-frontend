"use client";

import ProblemLevel from "@/components/ProblemLevel";
import { SAVE_NOTE, SettingRow, SettingsHeading, Switch } from "@/components/SettingsShell";
import { usePreferences } from "@/hooks/usePreferences";
import { useThemeMode, type ThemeMode } from "@/hooks/useTheme";

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "시스템 설정" },
  { value: "light", label: "밝게" },
  { value: "dark", label: "어둡게" },
];

export default function ViewSettings() {
  const [preferences, update] = usePreferences();
  const [themeMode, setThemeMode] = useThemeMode();

  return (
    <>
      <SettingsHeading title="보기" lead={SAVE_NOTE} />

      <SettingRow label="테마" hint="시스템 설정을 고르면 운영체제의 밝기 설정을 따릅니다.">
        <div role="radiogroup" aria-label="테마" className="inline-flex rounded-lg bg-fill p-0.5">
          {THEMES.map((theme) => (
            <label
              key={theme.value}
              className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-muted has-checked:bg-surface has-checked:font-semibold has-checked:text-fg has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-accent"
            >
              <input
                type="radio"
                name="theme"
                value={theme.value}
                checked={themeMode === theme.value}
                onChange={() => setThemeMode(theme.value)}
                className="sr-only"
              />
              {theme.label}
            </label>
          ))}
        </div>
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

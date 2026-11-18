"use client";

import { useState } from "react";
import { SettingRow, SettingsHeading } from "@/components/SettingsShell";
import { useHydrated } from "@/hooks/useHydrated";
import { loadLanguage, saveLanguage } from "@/lib/drafts";
import { LANGUAGE_LABELS } from "@/lib/languages";

export default function LanguageSettings() {
  const hydrated = useHydrated();
  return (
    <>
      <SettingsHeading title="언어" lead="이 브라우저에 저장됩니다." />
      {hydrated && <LanguageForm />}
    </>
  );
}

function LanguageForm() {
  const [language, setLanguage] = useState(loadLanguage);
  return (
    <SettingRow
      label="기본 언어"
      htmlFor="default-language"
      hint="문제를 처음 열 때 편집기에 고를 언어입니다. 문제 화면에서 언어를 바꾸면 그 언어를 기억합니다."
    >
      <select
        id="default-language"
        value={language}
        onChange={(event) => {
          setLanguage(event.target.value);
          saveLanguage(event.target.value);
        }}
        className="input w-56"
      >
        {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
    </SettingRow>
  );
}

"use client";

import { useSyncExternalStore } from "react";
import { SAVE_NOTE, SettingRow, SettingsHeading } from "@/components/SettingsShell";
import { LANGUAGE_EVENT, LANGUAGE_KEY, loadLanguage, saveLanguage } from "@/lib/drafts";
import { LANGUAGE_LABELS } from "@/lib/languages";

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener(LANGUAGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export default function LanguageSettings() {
  // 계정 설정을 내려받거나 다른 탭에서 바꿔도 따라 바뀐다.
  const language = useSyncExternalStore(subscribe, loadLanguage, () => "python");
  return (
    <>
      <SettingsHeading title="언어" lead={SAVE_NOTE} />
      <SettingRow
        label="기본 언어"
        htmlFor="default-language"
        hint="문제를 처음 열 때 편집기에 고를 언어입니다. 문제 화면에서 언어를 바꾸면 그 언어를 기억합니다."
      >
        <select
          id="default-language"
          value={language}
          onChange={(event) => saveLanguage(event.target.value)}
          className="input w-56"
        >
          {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </SettingRow>
    </>
  );
}

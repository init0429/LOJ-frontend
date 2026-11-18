"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/settings", label: "정보" },
  { href: "/settings/language", label: "언어" },
  { href: "/settings/editor", label: "에디터" },
  { href: "/settings/view", label: "보기" },
  { href: "/settings/solvedac", label: "solved.ac" },
];

/** 설정 화면의 틀. 왼쪽(좁은 화면에서는 위)에 메뉴, 오른쪽에 고른 항목. */
export default function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="page max-w-[920px]">
      <h1 className="page-title">설정</h1>
      <div className="mt-6 flex flex-col gap-6 md:flex-row md:gap-10">
        <nav aria-label="설정 메뉴" className="md:w-44 md:shrink-0">
          <ul className="flex flex-wrap gap-1 md:flex-col">
            {SECTIONS.map((section) => {
              const current = pathname === section.href;
              return (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    aria-current={current ? "page" : undefined}
                    className={`block rounded-md px-3 py-2 text-sm ${
                      current ? "bg-fill font-semibold text-fg" : "text-muted hover:bg-fill hover:text-fg"
                    }`}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

/** 언어·에디터·보기 설정을 어디에 저장하는지 */
export const SAVE_NOTE = "로그인하면 계정에 저장되어 다른 기기에서도 그대로 적용됩니다. 로그인하지 않았으면 이 브라우저에만 저장됩니다.";

/** 각 설정 항목의 제목과 설명 */
export function SettingsHeading({ title, lead }: { title: string; lead?: React.ReactNode }) {
  return (
    <header className="border-b border-line pb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {lead && <p className="mt-1 text-sm text-muted">{lead}</p>}
    </header>
  );
}

/** 설정 한 줄: 왼쪽에 이름과 설명, 오른쪽(좁은 화면에서는 아래)에 고르는 칸 */
export function SettingRow({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-line py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
        ) : (
          <p className="text-sm font-medium">{label}</p>
        )}
        {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** 켜고 끄는 단추. 옆의 label(htmlFor=id)이 이름이 된다. */
export function Switch({ id, checked, onChange }: { id: string; checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-fill-strong"
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

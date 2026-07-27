"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Scale } from "lucide-react";

const TABS = [
  { href: "/admin/contests", label: "콘테스트 개설" },
  { href: "/admin/problems", label: "문제 등록" },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex items-center gap-3 border-b border-(--rule) pb-4">
      <Scale className="text-(--seal)" size={22} />
      <div className="flex-1">
        <div className="docket-label text-[11px] text-(--text-faint)">
          Admin
        </div>
      </div>
      <div className="flex border border-(--rule)">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "docket-label text-[11px] px-4 py-2 transition-colors border-r border-(--rule) last:border-r-0",
              pathname === tab.href
                ? "bg-(--paper-raised) text-(--seal)"
                : "text-(--text-dim) hover:text-(--text) hover:bg-(--paper)",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

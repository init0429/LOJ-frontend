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
        <div className="mb-8 flex items-center gap-3 border-b border-[var(--rule)] pb-4">
            <Scale className="text-[var(--seal)]" size={22} />
            <div className="flex-1">
                <div className="docket-label text-[11px] text-[var(--text-faint)]">Admin</div>
            </div>
            <div className="flex border border-[var(--rule)]">
                {TABS.map((tab) => (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={clsx(
                            "docket-label text-[11px] px-4 py-2 transition-colors border-r border-[var(--rule)] last:border-r-0",
                            pathname === tab.href
                                ? "bg-[var(--paper-raised)] text-[var(--seal)]"
                                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--paper)]"
                        )}
                    >
                        {tab.label}
                    </Link>
                ))}
            </div>
        </div>
    );
}
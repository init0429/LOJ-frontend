"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/contests", label: "대회 개설" },
  { href: "/admin/problems", label: "문제 등록" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리 메뉴" className="-mx-2 mb-6 flex flex-wrap gap-0.5">
      {TABS.map((tab) => (
        <Link key={tab.href} href={tab.href} className="tab" aria-current={pathname === tab.href ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { usePreferences } from "@/hooks/usePreferences";

/**
 * 문제의 알고리즘 분류. 풀이 힌트가 되므로 눌러야 보인다.
 * 설정에서 "알고리즘 분류 항상 보기"를 켜면 처음부터 펼쳐 둔다.
 */
export default function SpoilerTags({ tags }: { tags: { key: string; name: string }[] }) {
  const [{ showTags }] = usePreferences();
  // 누르기 전에는 설정을 따르고, 누른 뒤에는 누른 대로 둔다.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? showTags;
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setToggled(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted hover:bg-fill hover:text-fg"
      >
        {open ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
        {open ? "태그 숨기기" : "태그 보기"}
      </button>
      {open && tags.map((tag) => <span key={tag.key} className="chip h-6 px-2">{tag.name}</span>)}
    </div>
  );
}

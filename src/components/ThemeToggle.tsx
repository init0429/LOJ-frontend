"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="라이트/다크 테마 전환"
      title="라이트/다크 테마 전환"
      className="theme-toggle inline-flex shrink-0 items-center justify-center min-h-10 min-w-10 rounded-lg border border-(--rule) bg-(--paper) text-(--text) hover:bg-(--paper-raised)"
    >
      <Moon className="theme-moon" size={18} aria-hidden="true" />
      <Sun className="theme-sun" size={18} aria-hidden="true" />
    </button>
  );
}

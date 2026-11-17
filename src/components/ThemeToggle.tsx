"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="밝은 화면과 어두운 화면 전환"
      title="밝은 화면과 어두운 화면 전환"
      className="inline-flex flex-none items-center justify-center w-9 h-9 rounded-md text-muted hover:bg-subtle hover:text-fg"
    >
      <Moon className="theme-moon" size={18} aria-hidden="true" />
      <Sun className="theme-sun" size={18} aria-hidden="true" />
    </button>
  );
}

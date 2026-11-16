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
      className="inline-flex flex-none items-center justify-center w-10 h-10 rounded-full text-pencil hover:bg-tint hover:text-marker"
    >
      <Moon className="theme-moon" size={18} aria-hidden="true" />
      <Sun className="theme-sun" size={18} aria-hidden="true" />
    </button>
  );
}

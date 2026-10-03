"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const key = "loj-theme";

function preferredTheme(): Theme {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    document.documentElement.dataset.theme = preferredTheme();
    onChange();
  };
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) sync();
  };
  media.addEventListener("change", sync);
  window.addEventListener("storage", onStorage);
  sync();
  return () => {
    observer.disconnect();
    media.removeEventListener("change", sync);
    window.removeEventListener("storage", onStorage);
  };
}

function snapshot(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, (): Theme => "light");
  const toggleTheme = () => {
    const next = snapshot() === "dark" ? "light" : "dark";
    try { localStorage.setItem(key, next); } catch {}
    document.documentElement.dataset.theme = next;
  };
  return { theme, toggleTheme };
}

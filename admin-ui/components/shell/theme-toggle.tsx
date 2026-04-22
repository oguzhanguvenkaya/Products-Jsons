"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Mode = "light" | "dark";

function resolveInitial(): Mode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("catalog-atelier.theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function apply(mode: Mode) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = mode;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const initial = resolveInitial();
    setMode(initial);
    apply(initial);
  }, []);

  function toggle() {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    apply(next);
    window.localStorage.setItem("catalog-atelier.theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "light" ? "Karanlık temaya geç" : "Aydınlık temaya geç"}
      aria-pressed={mode === "dark"}
      className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-surface text-foreground-muted transition-colors hover:border-terracotta-500/50 hover:text-stone-700"
    >
      {mode === "light" ? (
        <Moon className="size-4" aria-hidden />
      ) : (
        <Sun className="size-4" aria-hidden />
      )}
    </button>
  );
}

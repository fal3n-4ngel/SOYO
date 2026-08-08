"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

function resolve(theme: Theme): "light" | "dark" {
  if (theme !== "system") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = resolve(theme);
}

/**
 * Theme lives in localStorage so it applies before paint and stays per-device —
 * a phone can be dark while the desktop stays light. The config page also
 * persists it server-side as the default for new devices.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("soyo-theme") as Theme) || "light";
    setThemeState(stored);
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((localStorage.getItem("soyo-theme") as Theme) === "system") apply("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem("soyo-theme", next);
    setThemeState(next);
    apply(next);
  }, []);

  const toggle = useCallback(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggle, mounted, resolved: mounted ? resolve(theme) : "light" };
}

export function setAccent(color: string) {
  localStorage.setItem("soyo-accent", color);
  document.documentElement.style.setProperty("--accent", color);
}

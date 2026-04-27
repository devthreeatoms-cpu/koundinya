import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "koundinya-theme";
const PREFS_KEY = "koundinya-preferences";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
    // Back-compat: read from preferences blob written by Settings page
    const prefs = window.localStorage.getItem(PREFS_KEY);
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (parsed?.theme === "dark" || parsed?.theme === "light") return parsed.theme;
    }
  } catch {
    /* noop */
  }
  if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

function applyThemeClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readInitialTheme());

  useEffect(() => {
    applyThemeClass(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
      // Keep the preferences blob in sync too
      const prefs = window.localStorage.getItem(PREFS_KEY);
      const parsed = prefs ? JSON.parse(prefs) : {};
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ ...parsed, theme }));
    } catch {
      /* noop */
    }
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
  }
  function toggleTheme() {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

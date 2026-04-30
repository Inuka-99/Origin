/**
 * ThemeProvider.tsx
 *
 * App-wide light/dark theme controller.
 *
 * Three preferences are exposed to the user:
 *   - 'system' (default) — follows the OS's prefers-color-scheme.
 *   - 'light'             — force light.
 *   - 'dark'              — force dark.
 *
 * The chosen preference is persisted to localStorage. When the
 * preference is 'system' we listen on matchMedia so the theme
 * flips live if the user changes their OS appearance.
 *
 * The provider applies the theme by toggling the `dark` class on
 * <html>. CSS in `theme.css` does the rest via the `.dark` selector
 * over the design tokens.
 *
 * Usage:
 *   <ThemeProvider><App /></ThemeProvider>
 *   const { preference, resolved, setPreference } = useTheme();
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** What the user picked. */
  preference: ThemePreference;
  /** What's actually applied right now (system resolves to light/dark). */
  resolved: ResolvedTheme;
  /** Update the preference and persist it. */
  setPreference: (pref: ThemePreference) => void;
}

const STORAGE_KEY = 'origin:theme-preference';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // Update the <meta name="color-scheme"> hint so native form
  // controls (scrollbars, date pickers) follow the theme.
  root.style.colorScheme = theme;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultPreference?: ThemePreference;
}

export function ThemeProvider({
  children,
  defaultPreference,
}: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') {
      return defaultPreference ?? 'system';
    }
    return readStoredPreference();
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  );

  // Keep system theme in sync if the OS-level preference flips.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    // Older Safari uses addListener.
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else mql.removeListener(handler);
    };
  }, []);

  const resolved: ResolvedTheme =
    preference === 'system' ? systemTheme : preference;

  // Apply the resolved theme to <html> whenever it changes.
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage can throw in private browsing; non-fatal.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

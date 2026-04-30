/**
 * SidebarStateProvider.tsx
 *
 * Owns the collapsed / expanded state of the global sidebar and
 * publishes it as a CSS variable (`--sidebar-width`) on <html> so
 * the TopBar and every page's main container can offset themselves
 * by `var(--sidebar-width)` instead of the old hardcoded `ml-56`
 * / `left-56`. The CSS approach means we only have to flip one
 * value to shift the whole shell, with smooth animation.
 *
 * Persistence: the choice is saved to localStorage so the user's
 * preference survives reloads. If the user has never expressed a
 * preference, we default to expanded (224px) — full app, classic
 * Apple navigation pattern.
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

const STORAGE_KEY = 'origin:sidebar-collapsed';
export const SIDEBAR_WIDTH_EXPANDED = '14rem';   // 224px
export const SIDEBAR_WIDTH_COLLAPSED = '4.25rem'; // 68px — fits a 24px icon + 22px padding

interface SidebarStateValue {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (next: boolean) => void;
  /** Current width as a CSS length string (rem). */
  width: string;
}

const SidebarStateContext = createContext<SidebarStateValue | null>(null);

function readStored(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(STORAGE_KEY) === '1';
}

function applySidebarWidth(width: string): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--sidebar-width', width);
}

export function SidebarStateProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState<boolean>(() => readStored());

  const width = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  // Push the width onto :root whenever it changes so every consumer
  // (TopBar, page containers) animates in lockstep.
  useEffect(() => {
    applySidebarWidth(width);
  }, [width]);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
    } catch {
      // localStorage may be unavailable in private browsing — non-fatal.
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const value = useMemo<SidebarStateValue>(
    () => ({ collapsed, toggle, setCollapsed, width }),
    [collapsed, toggle, setCollapsed, width],
  );

  return (
    <SidebarStateContext.Provider value={value}>
      {children}
    </SidebarStateContext.Provider>
  );
}

export function useSidebarState(): SidebarStateValue {
  const ctx = useContext(SidebarStateContext);
  if (!ctx) {
    throw new Error('useSidebarState must be used inside <SidebarStateProvider>');
  }
  return ctx;
}

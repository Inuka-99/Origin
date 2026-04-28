import { createRoot } from 'react-dom/client';
import { AuthProvider } from './app/auth';
import { ThemeProvider } from './app/theme';
import { SidebarStateProvider } from './app/layout';
import App from './app/App.tsx';
import './styles/index.css';

/**
 * Pre-React boot script:
 *  1. Apply the saved theme so we don't flash light-mode on load.
 *  2. Apply the saved sidebar width so the layout doesn't jump
 *     from expanded to collapsed once React mounts.
 *
 * Both are best-effort — if localStorage throws (private mode), the
 * providers will retry on mount.
 */
(function bootShell() {
  try {
    // ---- Theme ----------------------------------------------------
    const storedTheme = window.localStorage.getItem('origin:theme-preference');
    const themePref = storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system'
      ? storedTheme
      : 'system';
    const resolvedTheme =
      themePref === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : themePref;
    if (resolvedTheme === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = resolvedTheme;

    // ---- Sidebar width -------------------------------------------
    const collapsed = window.localStorage.getItem('origin:sidebar-collapsed') === '1';
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? '4.25rem' : '14rem',
    );
  } catch {
    /* non-fatal */
  }
})();

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <SidebarStateProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SidebarStateProvider>
  </ThemeProvider>,
);

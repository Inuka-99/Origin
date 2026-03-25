/**
 * LogoutButton.tsx
 *
 * Ends the Auth0 session and redirects the user back to the app root.
 * Use this in the TopBar user menu or settings page.
 */

import { useAuth0 } from '@auth0/auth0-react';

interface LogoutButtonProps {
  className?: string;
  label?: string;
}

export function LogoutButton({
  className,
  label = 'Sign Out',
}: LogoutButtonProps) {
  const { logout } = useAuth0();

  return (
    <button
      onClick={() =>
        logout({ logoutParams: { returnTo: window.location.origin } })
      }
      className={
        className ??
        'w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors'
      }
    >
      {label}
    </button>
  );
}

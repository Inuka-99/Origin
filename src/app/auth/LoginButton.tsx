/**
 * LoginButton.tsx
 *
 * Triggers Auth0 Universal Login (redirect flow).
 * Drop this anywhere you need a "Sign In" CTA.
 */

import { useAuth0 } from '@auth0/auth0-react';

interface LoginButtonProps {
  className?: string;
  label?: string;
}

export function LoginButton({
  className,
  label = 'Sign In',
}: LoginButtonProps) {
  const { loginWithRedirect } = useAuth0();

  return (
    <button
      onClick={() => loginWithRedirect()}
      className={
        className ??
        'bg-accent text-white px-6 py-2.5 rounded-lg hover:bg-accent-hover transition-colors font-medium text-sm'
      }
    >
      {label}
    </button>
  );
}

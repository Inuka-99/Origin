/**
 * Unauthorized.tsx
 *
 * Fallback page shown when a user tries to access a protected route
 * without being logged in (after the Auth0 loading phase has completed).
 *
 * Includes a one-click "Sign In" button that triggers Auth0 Universal Login.
 */

import { useAuth0 } from '@auth0/auth0-react';

export function Unauthorized() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
        >
          ORIGIN
        </div>
        <h1
          className="text-3xl font-semibold mb-3"
          style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-primary)' }}
        >
          Sign in required
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          You need to be signed in to access this page. Click below to continue
          with your account.
        </p>
        <button
          onClick={() => loginWithRedirect()}
          className="bg-accent text-white px-8 py-2.5 rounded-lg hover:bg-accent-hover transition-colors font-medium text-sm"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

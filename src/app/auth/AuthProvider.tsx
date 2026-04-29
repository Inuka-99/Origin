/**
 * AuthProvider.tsx
 *
 * Wraps the entire app with Auth0's context provider.
 * Reads config from VITE_ environment variables so nothing is hardcoded.
 *
 * Place this as high as possible in the component tree (main.tsx).
 */

import { Auth0Provider } from '@auth0/auth0-react';
import type { ReactNode } from 'react';
import { getAuth0Config } from './auth.interfaces';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { domain, clientId, audience, redirectUri } = getAuth0Config();

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri ?? window.location.origin,
        audience,
      }}
      // Cache tokens in memory (default). For persistent sessions across
      // refreshes, you can switch to `cacheLocation="localstorage"`.
    >
      {children}
    </Auth0Provider>
  );
}
   
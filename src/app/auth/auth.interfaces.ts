/**
 * auth.interfaces.ts
 *
 * Shared TypeScript types for the Auth0 integration.
 * Used by hooks, components, and the API client.
 */

/** The shape of a decoded Auth0 user profile. */
export interface AuthUser {
  /** Auth0 user ID (e.g. "auth0|abc123" or "google-oauth2|456") */
  sub: string;
  /** User's display name */
  name: string;
  /** User's email address */
  email: string;
  /** Whether Auth0 has verified the user's email */
  email_verified: boolean;
  /** URL to the user's profile picture */
  picture: string;
  /** ISO timestamp of last profile update */
  updated_at: string;
}

/** Auth0 environment configuration read from VITE_ env vars. */
export interface Auth0Config {
  domain: string;
  clientId: string;
  audience: string;
  apiUrl: string;
  redirectUri?: string;
}

/** Reads and validates Auth0 config from Vite env vars. */
export function getAuth0Config(): Auth0Config {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;
  const apiUrl = import.meta.env.VITE_API_URL;
  const redirectUri = import.meta.env.VITE_AUTH0_REDIRECT_URI;

  if (!domain || !clientId || !audience) {
    throw new Error(
      'Missing Auth0 environment variables. ' +
        'Make sure VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE ' +
        'are set in your .env file at the project root.'
    );
  }

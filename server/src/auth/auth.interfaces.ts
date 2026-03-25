/**
 * auth.interfaces.ts
 *
 * TypeScript interfaces for the Auth0 JWT payload and authenticated user.
 * These types are used by the JWT strategy, guards, and decorators.
 */

/**
 * The decoded Auth0 access token payload.
 * Auth0 adds standard claims plus custom ones you configure in Actions/Rules.
 */
export interface Auth0JwtPayload {
  /** Issuer — your Auth0 tenant URL (e.g. https://dev-abc123.us.auth0.com/) */
  iss: string;
  /** Subject — the Auth0 user ID (e.g. auth0|abc123) */
  sub: string;
  /** Audience — array of API identifiers this token is valid for */
  aud: string | string[];
  /** Expiration time (Unix timestamp) */
  exp: number;
  /** Issued-at time (Unix timestamp) */
  iat: number;
  /** Auth0 authorized party (the client ID that requested the token) */
  azp?: string;
  /** Scopes granted to this token */
  scope?: string;
  /**
   * Permissions granted via Auth0 RBAC.
   * Populated when "Add Permissions in the Access Token" is enabled
   * in your Auth0 API settings.
   */
  permissions?: string[];
}

/**
 * The shape attached to `request.user` after JWT validation.
 * This is what @CurrentUser() returns in your controllers.
 */
export interface AuthenticatedUser {
  /** Auth0 user ID (e.g. "auth0|abc123" or "google-oauth2|456") */
  userId: string;
  /** Permissions from the access token (for RBAC) */
  permissions: string[];
}

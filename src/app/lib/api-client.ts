/**
 * api-client.ts
 *
 * Authenticated HTTP client for calling the backend API.
 *
 * How it works:
 *  1. Calls Auth0's `getAccessTokenSilently()` to get a fresh JWT.
 *  2. Attaches the token as a Bearer header.
 *  3. Sends the request to VITE_API_URL.
 *
 * Usage in a component:
 *
 *   import { useApiClient } from '@/app/lib/api-client';
 *
 *   function MyComponent() {
 *     const api = useApiClient();
 *
 *     const loadData = async () => {
 *       const data = await api.get('/projects');
 *       console.log(data);
 *     };
 *   }
 */

import { useAuth0 } from '@auth0/auth0-react';
import { useCallback, useMemo } from 'react';
import { getAuth0Config } from '../auth/auth.interfaces';

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

export interface ApiClient {
  /** Send a GET request. Returns parsed JSON. */
  get: <T = unknown>(path: string, options?: RequestOptions) => Promise<T>;
  /** Send a POST request with a JSON body. */
  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  /** Send a PUT request with a JSON body. */
  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  /** Send a PATCH request with a JSON body. */
  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  /** Send a DELETE request. */
  delete: <T = unknown>(path: string, options?: RequestOptions) => Promise<T>;
}

/**
 * React hook that returns an authenticated API client.
 * Must be used inside a component wrapped with Auth0Provider.
 */
export function useApiClient(): ApiClient {
  const { getAccessTokenSilently } = useAuth0();
  const { apiUrl, audience } = getAuth0Config();

  const request = useCallback(
    async <T = unknown>(
      method: string,
      path: string,
      body?: unknown,
      options: RequestOptions = {}
    ): Promise<T> => {
      const token = await getAccessTokenSilently({
        authorizationParams: { audience },
      });

      const url = `${apiUrl}${path}`;

      const response = await fetch(url, {
        method,
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `API ${method} ${path} failed (${response.status}): ${errorBody}`
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    },
    [getAccessTokenSilently, apiUrl, audience]
  );

  return useMemo(
    () => ({
      get: <T = unknown>(path: string, options?: RequestOptions) =>
        request<T>('GET', path, undefined, options),
      post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('POST', path, body, options),
      put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('PUT', path, body, options),
      patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
        request<T>('PATCH', path, body, options),
      delete: <T = unknown>(path: string, options?: RequestOptions) =>
        request<T>('DELETE', path, undefined, options),
    }),
    [request]
  );
}

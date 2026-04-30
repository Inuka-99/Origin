/**
 * rate-limit.middleware.ts
 *
 * Lightweight in-process rate limiter using a fixed window.
 *
 * For each identity (authenticated user id when available, else the
 * remote IP) we count requests within a fixed window. When the
 * count exceeds the threshold we return HTTP 429 with a
 * Retry-After header.
 *
 * Trade-offs:
 *   - In-process: limits are NOT shared across server replicas.
 *     That's acceptable for a starting point: each replica enforces
 *     its own slice and the aggregate effect is "good enough" abuse
 *     protection. When scaling out, swap for a Redis-backed limiter
 *     (e.g. @nestjs/throttler with redis storage).
 *   - Fixed window: simpler than a token bucket and bounded memory
 *     because we only track a counter per identity per window.
 *
 * Configuration:
 *   The limits are class constants below. We deliberately don't take
 *   them as constructor parameters — Nest's DI system resolves
 *   parameter types via TypeScript's reflect-metadata, and a generic
 *   `Partial<Options>` parameter erases to `Object` at runtime,
 *   which Nest cannot resolve. If we ever need configurability,
 *   convert this into a dynamic module with `forRoot(options)` and
 *   inject the options via a token.
 */

import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/** Window length in milliseconds. */
const WINDOW_MS = 60_000;
/**
 * Maximum requests allowed per identity per window.
 * 600/min (=10/sec) is generous for normal usage of an
 * interactive SaaS app — every page load triggers several GETs
 * (channels, profile, tasks, projects…), and chat-heavy users
 * type quickly. We were tripping the previous 120/min limit
 * during normal use. This is still strong abuse protection; a
 * single rogue script will still be cut off long before it can
 * cause damage.
 */
const MAX_PER_WINDOW = 600;
/** Hard cap on tracked identities to bound memory. */
const MAX_IDENTITIES = 10_000;

interface WindowState {
  windowStart: number;
  count: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private readonly buckets = new Map<string, WindowState>();

  use(req: Request, res: Response, next: NextFunction): void {
    const identity = this.identityFor(req);
    const now = Date.now();

    let state = this.buckets.get(identity);
    if (!state || now - state.windowStart >= WINDOW_MS) {
      // New window — also a good moment to evict if we're over cap.
      if (this.buckets.size >= MAX_IDENTITIES) {
        const oldest = this.buckets.keys().next().value as string | undefined;
        if (oldest !== undefined) this.buckets.delete(oldest);
      }
      state = { windowStart: now, count: 0 };
      this.buckets.set(identity, state);
    }

    state.count += 1;

    const remaining = Math.max(0, MAX_PER_WINDOW - state.count);
    res.setHeader('X-RateLimit-Limit', String(MAX_PER_WINDOW));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (state.count > MAX_PER_WINDOW) {
      const retryAfterSec = Math.ceil(
        (state.windowStart + WINDOW_MS - now) / 1000,
      );
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSec)));
      this.logger.warn(`Rate limit hit for ${identity}`);
      throw new HttpException(
        'Too many requests — please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  /**
   * Prefer the authenticated user id (set by JwtStrategy) so a
   * single abusive client cannot evade limits by rotating IPs.
   * Falls back to the IP for anonymous or unauthenticated routes
   * (e.g. health check).
   */
  private identityFor(req: Request): string {
    const user = (req as Request & { user?: { userId?: string } }).user;
    if (user?.userId) return `user:${user.userId}`;

    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    return `ip:${ip}`;
  }
}

/**
 * rate-limit.interceptor.ts
 *
 * Per-user rate limiter that runs as a Nest interceptor (after the
 * JwtAuthGuard, so `req.user.userId` is populated). For
 * unauthenticated requests it falls back to the client IP.
 *
 * Limits:
 *   - Production: 600 req/min/identity. Strong abuse protection
 *     while still allowing comfortable interactive use.
 *   - Development: 6000 req/min/identity. Effectively unlimited for
 *     normal usage; we still keep some ceiling to surface runaway
 *     loops in the logs without immediately breaking the UI. Set
 *     NODE_ENV=production to engage the tighter limit.
 *
 * GETs and the index/health endpoint are excluded entirely so a
 * busy dashboard never locks the user out — only writes count
 * against the budget. (The previous all-methods limiter was
 * tripping during normal interactive use.)
 */

import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable } from 'rxjs';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = process.env.NODE_ENV === 'production' ? 600 : 6000;
const MAX_IDENTITIES = 10_000;

interface WindowState {
  windowStart: number;
  count: number;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private readonly buckets = new Map<string, WindowState>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Skip safe / harmless requests entirely so reads never burn
    // the user's budget.
    if (
      req.method === 'OPTIONS' ||
      req.method === 'HEAD' ||
      req.method === 'GET'
    ) {
      return next.handle();
    }

    if (req.path === '/') {
      return next.handle();
    }

    const identity = this.identityFor(req);
    const now = Date.now();

    let state = this.buckets.get(identity);
    if (!state || now - state.windowStart >= WINDOW_MS) {
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
      const retryAfterSec = Math.ceil((state.windowStart + WINDOW_MS - now) / 1000);
      res.setHeader('Retry-After', String(Math.max(1, retryAfterSec)));

      // Production: actually 429 the request — abuse protection.
      // Development: log once at warn-level with the offending route
      //              so the operator can see what's looping, but
      //              don't break the user's flow. Looking at the
      //              path is enough to diagnose; we don't need the
      //              UI to fall over while we're debugging.
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn(`Rate limit hit for ${identity} on ${req.method} ${req.path}`);
        throw new HttpException(
          'Too many requests — please slow down.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else {
        // Throttle the log itself so a tight loop doesn't spam too.
        if (state.count === MAX_PER_WINDOW + 1 || state.count % 60 === 0) {
          this.logger.warn(
            `[dev] Rate limit would-block ${identity}: ${state.count} writes/min — most recent ${req.method} ${req.path}`,
          );
        }
      }
    }

    return next.handle();
  }

  private identityFor(req: Request): string {
    const user = (req as Request & { user?: { userId?: string } }).user;
    if (user?.userId) {
      return `user:${user.userId}`;
    }

    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
    return `ip:${ip}`;
  }
}

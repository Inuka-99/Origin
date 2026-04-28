/**
 * rate-limit.interceptor.ts
 *
 * Similar to the original rate-limit middleware, but runs as a
 * NestJS interceptor so it executes after authentication has already
 * populated `req.user`. That lets us rate-limit by user ID for
 * authenticated requests instead of falling back to the shared IP.
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
const MAX_PER_WINDOW = 600;
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

    // Do not count harmless preflight or health-check requests.
    if (req.method === 'OPTIONS' || req.method === 'HEAD') {
      return next.handle();
    }

    if (req.method === 'GET' && req.path === '/') {
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
      this.logger.warn(`Rate limit hit for ${identity}`);
      throw new HttpException(
        'Too many requests — please slow down.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
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

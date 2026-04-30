/**
 * user-role.cache.ts
 *
 * Caches the global role of each authenticated user for a short TTL.
 *
 * Motivation:
 *   Before this cache, every list/get/update/delete endpoint called
 *   getUserRole() which performed a Supabase round-trip on EVERY
 *   request. With 100 active users averaging a request every few
 *   seconds, that's hundreds of redundant Postgres queries per
 *   minute. The role only changes when an admin runs the role-change
 *   flow, so a 60-second TTL is a safe sweet spot.
 *
 * Invalidation:
 *   UsersService.updateRole() must call `invalidate(userId)` after a
 *   successful update so the new role takes effect within one
 *   request, not after the TTL expires.
 */

import { Injectable } from '@nestjs/common';
import { TtlCache } from '../common/ttl-cache';

const ROLE_TTL_MS = 60_000;
const ROLE_MAX_ENTRIES = 10_000;

@Injectable()
export class UserRoleCache {
  private readonly cache = new TtlCache<string, string>(
    ROLE_TTL_MS,
    ROLE_MAX_ENTRIES,
  );

  get(userId: string): string | undefined {
    return this.cache.get(userId);
  }

  set(userId: string, role: string): void {
    this.cache.set(userId, role);
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }
}

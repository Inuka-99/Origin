/**
 * user-sync.interceptor.ts
 *
 * NestJS interceptor that syncs Auth0 users to Supabase on first request.
 *
 * When a user authenticates via Auth0 and calls the API for the first time,
 * this interceptor ensures they have a corresponding row in the Supabase
 * `profiles` table. If no profile exists, it creates one with default
 * 'member' role.
 *
 * Apply globally in AppModule or per-controller.
 */

import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  Logger,
} from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import type { AuthenticatedUser } from './auth.interfaces';
import { SupabaseService } from '../supabase';

@Injectable()
export class UserSyncInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UserSyncInterceptor.name);
  /** Cache of already-synced user IDs to avoid DB hits on every request */
  private readonly syncedUsers = new Set<string>();

  constructor(private readonly supabase: SupabaseService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (user && !this.syncedUsers.has(user.userId)) {
      await this.ensureProfile(user.userId);
      this.syncedUsers.add(user.userId);
    }

    return next.handle();
  }

  private async ensureProfile(auth0Id: string): Promise<void> {
    const client = this.supabase.getClient();

    // Check if profile already exists
    const { data: existing } = await client
      .from('profiles')
      .select('id')
      .eq('id', auth0Id)
      .single();

    if (existing) return;

    // Create profile — we store the Auth0 user ID as the profile ID.
    // Note: Since the profiles table references auth.users(id), and we're
    // using Auth0 (not Supabase Auth), we insert directly with service role.
    const { error } = await client.from('profiles').insert({
      id: auth0Id,
      email: '', // Will be updated when user hits /me endpoint
      full_name: '',
      role: 'member',
    });

    if (error) {
      // Unique constraint = profile was created by another concurrent request
      if (error.code === '23505') return;
      this.logger.warn(`Failed to sync profile for ${auth0Id}: ${error.message}`);
    } else {
      this.logger.log(`Created Supabase profile for Auth0 user ${auth0Id}`);
    }
  }
}

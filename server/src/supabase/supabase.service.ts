/**
 * supabase.service.ts
 *
 * Provides a Supabase admin client (using the service_role key)
 * for server-side database operations. This bypasses RLS so the
 * backend can manage data on behalf of any user.
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;
  private readonly logger = new Logger(SupabaseService.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.getOrThrow<string>('SUPABASE_URL');
    const key = this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });

    this.logger.log('Supabase admin client initialized');
  }

  /** Returns the admin Supabase client (bypasses RLS). */
  getClient(): SupabaseClient {
    return this.client;
  }
}

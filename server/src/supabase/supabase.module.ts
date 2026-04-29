/**
 * supabase.module.ts
 *
 * Global module that provides SupabaseService to the entire application.
 */

import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}

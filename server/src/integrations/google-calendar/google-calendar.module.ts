/**
 * google-calendar.module.ts
 *
 * Feature module for the Google Calendar integration.
 *
 * Exports GoogleCalendarService so the TasksService can fire sync hooks
 * after create / update / delete without a circular import.
 */

import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../../auth';
import { SupabaseModule } from '../../supabase';
import { TasksModule } from '../../tasks/tasks.module';
import { Auth0ManagementService } from './auth0-management.service';
import { GCalConnectionRepository } from './connection.repository';
import { GoogleCalendarClientFactory } from './google-calendar-client.factory';
import { GoogleCalendarController } from './google-calendar.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleOAuthService } from './google-oauth.service';
import { TokenCryptoService } from './token-crypto.service';

@Module({
  imports: [SupabaseModule, AuthModule, forwardRef(() => TasksModule)],
  controllers: [GoogleCalendarController],
  providers: [
    TokenCryptoService,
    GCalConnectionRepository,
    Auth0ManagementService,
    GoogleOAuthService,
    GoogleCalendarClientFactory,
    GoogleCalendarService,
  ],
  exports: [GoogleCalendarService],
})
export class GoogleCalendarModule {}

/**
 * app.module.ts
 *
 * Root module that wires together:
 *  - ConfigModule: loads .env variables
 *  - SupabaseModule: Supabase admin client (global)
 *  - AuthModule: Auth0 JWT validation + RBAC guards
 *  - UsersModule: User profile & role management (provides UserRoleCache)
 *  - ProjectsModule: Project CRUD with role-based access
 *  - TasksModule: Task CRUD with role-based access
 *  - ActivityLogModule: Activity feed & audit log
 *  - GoogleCalendarModule: /api/integrations/google/* + OAuth callback
 *  - AppController: Health check + demo routes
 *
 * Also applies the global RateLimitMiddleware to every authenticated
 * route. Health checks (handled by AppController) are deliberately
 * excluded so external uptime probes aren't throttled.
 */

import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth';
import { SupabaseModule } from './supabase';
import { UsersModule } from './users';
import { ProjectsModule } from './projects';
import { TasksModule } from './tasks/tasks.module';
import { ActivityLogModule } from './activity-log';
import { ChatModule } from './chat';
import { GoogleCalendarModule } from './integrations/google-calendar';
import { AppController } from './app.controller';
import { RateLimitMiddleware } from './common/rate-limit.middleware';

@Module({
  imports: [
    // Load .env file and make ConfigService available everywhere
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Supabase admin client (global — available to all modules)
    SupabaseModule,

    // Auth0 JWT protection + RBAC guards
    AuthModule,

    // User profile & role management (also exposes UserRoleCache)
    UsersModule,

    // Project CRUD with role-based access
    ProjectsModule,

    // Task CRUD with role-based access
    TasksModule,

    // Activity log / audit feed
    ActivityLogModule,

    // Native team chat (channels, DMs, attachments)
    ChatModule,

    // Google Calendar integration — exposes /api/integrations/google/*
    // and the OAuth callback that Google redirects to after consent.
    GoogleCalendarModule,
  ],
  controllers: [AppController],
  providers: [RateLimitMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Apply rate limiting to every authenticated route. We exclude
    // GET / (the health check on AppController) so probes can poll
    // freely without hitting 429.
    consumer
      .apply(RateLimitMiddleware)
      .exclude({ path: '/', method: RequestMethod.GET })
      .forRoutes('*');
  }
}

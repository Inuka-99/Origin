/**
 * app.module.ts
 *
 * Root module that wires together:
 *  - ConfigModule: loads .env variables
 *  - SupabaseModule: Supabase admin client (global)
 *  - AuthModule: Auth0 JWT validation + RBAC guards
 *  - UsersModule: User profile & role management
 *  - ProjectsModule: Project CRUD with role-based access
 *  - AppController: Health check + demo routes
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth';
import { SupabaseModule } from './supabase';
import { UsersModule } from './users';
import { ProjectsModule } from './projects';
import { TasksModule } from './tasks/tasks.module';
import { AppController } from './app.controller';

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

    // User profile & role management
    UsersModule,

    // Project CRUD with role-based access
    ProjectsModule,

    // Task CRUD with role-based access
    TasksModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

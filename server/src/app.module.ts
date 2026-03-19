/**
 * app.module.ts
 *
 * Root module that wires together:
 *  - ConfigModule: loads .env variables
 *  - AuthModule: Auth0 JWT validation
 *  - AppController: API routes
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Load .env file and make ConfigService available everywhere
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Auth0 JWT protection
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

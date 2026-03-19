/**
 * auth.module.ts
 *
 * Auth module that registers the JWT strategy and exports the guards
 * so they can be used across the application.
 *
 * Import this module in AppModule to enable Auth0 JWT protection.
 */

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy, PermissionsGuard],
  exports: [PassportModule, PermissionsGuard],
})
export class AuthModule {}

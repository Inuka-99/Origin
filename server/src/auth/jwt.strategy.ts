/**
 * jwt.strategy.ts
 *
 * Passport strategy that validates Auth0 JWTs on every protected request.
 *
 * How it works:
 *  1. Extracts the Bearer token from the Authorization header.
 *  2. Fetches Auth0's public signing keys via JWKS (JSON Web Key Set).
 *  3. Verifies the token's signature, issuer, audience, and expiration.
 *  4. Calls validate() which maps the decoded payload to an AuthenticatedUser
 *     and attaches it to request.user.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { Auth0JwtPayload, AuthenticatedUser } from './auth.interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const domain = configService.getOrThrow<string>('AUTH0_DOMAIN');
    const audience = configService.getOrThrow<string>('AUTH0_AUDIENCE');
    const issuer = configService.getOrThrow<string>('AUTH0_ISSUER_URL');

    super({
      // Extract token from "Authorization: Bearer <token>" header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Fetch Auth0's public keys from the JWKS endpoint.
      // jwks-rsa caches keys automatically to avoid hammering the endpoint.
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${domain}/.well-known/jwks.json`,
      }),

      // Validate these claims match our Auth0 configuration
      audience,
      issuer,
      algorithms: ['RS256'],
    });
  }

  /**
   * Called after the JWT is verified. The return value is attached to `request.user`.
   */
  validate(payload: Auth0JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      permissions: payload.permissions ?? [],
    };
  }
}

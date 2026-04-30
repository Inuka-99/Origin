/**
 * main.ts
 *
 * NestJS application bootstrap.
 * Configures CORS so the Vite dev server (localhost:5173) can call the API.
 */

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RateLimitInterceptor } from './common/rate-limit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:5173');

  const rateLimiter = app.get(RateLimitInterceptor);
  app.useGlobalInterceptors(rateLimiter);

  // Allow the frontend origin to call the API
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  await app.listen(port);
  console.log(`Origin API running on http://localhost:${port}`);
}

bootstrap();

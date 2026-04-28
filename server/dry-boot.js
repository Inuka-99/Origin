process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy';
process.env.AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || 'test.auth0.com';
process.env.AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'test-audience';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy';
process.env.GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/cb';
process.env.GOOGLE_OAUTH_STATE_SECRET = process.env.GOOGLE_OAUTH_STATE_SECRET || 'shhhhhh';
process.env.TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'a'.repeat(64);
process.env.AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID || 'dummy';
process.env.AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET || 'dummy';

(async () => {
  try {
    const { NestFactory } = require('@nestjs/core');
    const { AppModule } = require('/tmp/origin-server-dist/app.module.js');
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    console.log('OK: Nest module graph resolved successfully');
    await app.close();
    process.exit(0);
  } catch (e) {
    console.error('FAIL:', e && e.message ? e.message : e);
    if (e && e.stack) console.error(e.stack.split('\n').slice(0, 8).join('\n'));
    process.exit(1);
  }
})();
